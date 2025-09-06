/**
 * API Caching Service
 * In-memory caching for API responses with TTL and LRU eviction
 */

const crypto = require('crypto');
const config = require('../config/environment');

class CacheService {
    constructor() {
        this.cache = new Map();
        this.accessOrder = new Map(); // For LRU tracking
        this.enabled = config.get('cache.enabled');
        this.ttlMs = config.get('cache.ttlMinutes') * 60 * 1000;
        this.maxEntries = config.get('cache.maxEntries');
        
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            size: 0
        };

        // Cleanup expired entries every minute
        if (this.enabled) {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
            console.log('✅ Cache service initialized');
        }
    }

    generateKey(prefix, ...args) {
        const keyData = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join('|');
        
        const hash = crypto.createHash('md5').update(keyData).digest('hex');
        return `${prefix}:${hash}`;
    }

    get(key) {
        if (!this.enabled) return null;

        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            this.stats.size--;
            this.stats.misses++;
            return null;
        }

        // Update access order for LRU
        this.accessOrder.set(key, Date.now());
        this.stats.hits++;
        
        console.log(`🎯 Cache HIT: ${key}`);
        return entry.data;
    }

    set(key, data, customTtl = null) {
        if (!this.enabled) return;

        const ttl = customTtl || this.ttlMs;
        const expiresAt = Date.now() + ttl;

        // Check if we need to evict entries
        if (this.cache.size >= this.maxEntries) {
            this.evictLRU();
        }

        const entry = {
            data,
            expiresAt,
            createdAt: Date.now()
        };

        this.cache.set(key, entry);
        this.accessOrder.set(key, Date.now());
        this.stats.sets++;
        this.stats.size = this.cache.size;

        console.log(`💾 Cache SET: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
    }

    evictLRU() {
        // Find least recently used entry
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, accessTime] of this.accessOrder) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessOrder.delete(oldestKey);
            this.stats.evictions++;
            this.stats.size = this.cache.size;
            console.log(`🗑️ Cache LRU evicted: ${oldestKey}`);
        }
    }

    cleanup() {
        const now = Date.now();
        let expiredCount = 0;

        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            this.stats.size = this.cache.size;
            console.log(`🧹 Cache cleanup: removed ${expiredCount} expired entries`);
        }
    }

    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.stats.size = 0;
        console.log('🗑️ Cache cleared');
    }

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
            : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            enabled: this.enabled,
            ttlMinutes: this.ttlMs / 60000,
            maxEntries: this.maxEntries
        };
    }

    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
        console.log('✅ Cache service shutdown');
    }
}

// Specialized caching methods for different data types
class MatchResultCache extends CacheService {
    cacheMatchResult(team, opponent, matchDate, result) {
        const key = this.generateKey('match', team, opponent, matchDate);
        this.set(key, result, 24 * 60 * 60 * 1000); // Cache for 24 hours
    }

    getMatchResult(team, opponent, matchDate) {
        const key = this.generateKey('match', team, opponent, matchDate);
        return this.get(key);
    }

    cacheTeamSearch(teamName, teamData) {
        const key = this.generateKey('team', teamName);
        this.set(key, teamData, 7 * 24 * 60 * 60 * 1000); // Cache for 7 days
    }

    getTeamSearch(teamName) {
        const key = this.generateKey('team', teamName);
        return this.get(key);
    }

    cacheAPIResponse(endpoint, params, response) {
        const key = this.generateKey('api', endpoint, params);
        this.set(key, response, 30 * 60 * 1000); // Cache for 30 minutes
    }

    getAPIResponse(endpoint, params) {
        const key = this.generateKey('api', endpoint, params);
        return this.get(key);
    }
}

module.exports = new MatchResultCache();