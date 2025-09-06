/**
 * Betting Slip Analysis Service
 * Handles OCR text parsing and bet selection extraction
 */

const config = require('../config/environment');

class BettingSlipAnalyzer {
    constructor() {
        // Known team names for anchor detection
        this.knownTeams = [
            'liverpool', 'manchester', 'chelsea', 'arsenal', 'tottenham', 'newcastle',
            'barcelona', 'madrid', 'bayern', 'juventus', 'milan', 'inter', 'napoli',
            'paris', 'psg', 'lyon', 'marseille', 'monaco', 'lille', 'nice',
            'dortmund', 'leipzig', 'leverkusen', 'frankfurt', 'wolfsburg',
            'atletico', 'sevilla', 'valencia', 'villarreal', 'betis', 'sociedad',
            'atalanta', 'roma', 'lazio', 'fiorentina', 'torino', 'bologna',
            'birmingham', 'coventry', 'cardiff', 'swansea', 'leeds', 'norwich',
            'leicester', 'brighton', 'crystal', 'west', 'aston', 'villa',
            'burnley', 'brentford', 'fulham', 'wolves', 'everton', 'southampton',
            'braga', 'porto', 'sporting', 'benfica', 'vitoria', 'guimaraes'
        ];

        // Betting market terms
        this.bettingMarkets = [
            'yes', 'no', 'draw', 'over', 'under', 'both', 'either', 
            'home', 'away', 'first', 'last', 'anytime', 'correct'
        ];
    }

    analyze(ocrText) {
        const analysis = {
            isBettingSlip: false,
            betRef: null,
            selections: [],
            stake: null,
            toReturn: null,
            boost: null,
            betType: null,
            odds: null,
            matchDate: null,
            metadata: {
                processingTime: Date.now(),
                textLength: ocrText.length,
                lineCount: 0
            }
        };

        try {
            const lines = this.preprocessText(ocrText);
            analysis.metadata.lineCount = lines.length;

            // Check if this is a betting slip
            if (!this.isBettingSlip(lines)) {
                return analysis;
            }

            analysis.isBettingSlip = true;

            // Extract basic betting slip information
            this.extractBettingSlipData(lines, analysis);

            // Parse selections using anchor-based approach
            analysis.selections = this.parseSelections(lines);

            console.log(`✅ Betting slip analysis complete: ${analysis.selections.length} selections found`);
            
        } catch (error) {
            console.error('❌ Error analyzing betting slip:', error);
            analysis.error = error.message;
        }

        analysis.metadata.processingTime = Date.now() - analysis.metadata.processingTime;
        return analysis;
    }

    preprocessText(text) {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/\s+/g, ' ')); // Normalize whitespace
    }

    isBettingSlip(lines) {
        const bettingSlipIndicators = [
            'bet ref', 'bet placed', 'to return', 'stake', 'odds',
            'fold', 'accumulator', 'single', 'double', 'treble'
        ];

        return lines.some(line => 
            bettingSlipIndicators.some(indicator => 
                line.toLowerCase().includes(indicator)
            )
        );
    }

    extractBettingSlipData(lines, analysis) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();

            // Extract bet reference
            if (line.includes('bet ref')) {
                const match = lines[i].match(/bet ref ([a-z0-9]+)/i);
                if (match) analysis.betRef = match[1];
            }

            // Extract date
            const dateMatch = lines[i].match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i);
            if (dateMatch) {
                analysis.matchDate = this.parseMatchDate(dateMatch[0]);
            }

            // Extract stake
            if (line.includes('stake')) {
                const match = lines[i].match(/£([0-9.]+)/i);
                if (match) analysis.stake = parseFloat(match[1]);
            }

            // Extract return amount
            if (line.includes('to return')) {
                const match = lines[i].match(/to return £([0-9.]+)/i);
                if (match) analysis.toReturn = parseFloat(match[1]);
            }

            // Extract boost
            if (line.includes('boost')) {
                const match = lines[i].match(/£([0-9.]+) boost/i);
                if (match) analysis.boost = parseFloat(match[1]);
            }

            // Extract bet type and odds
            if (line.includes('fold')) {
                const match = lines[i].match(/([0-9]+) fold.*?([0-9.]+)/i);
                if (match) {
                    analysis.betType = `${match[1]} Fold`;
                    analysis.odds = parseFloat(match[2]);
                }
            }
        }
    }

    parseSelections(lines) {
        const selections = [];
        const selectionBlocks = this.groupIntoBlocks(lines);

        console.log(`🔍 Found ${selectionBlocks.length} selection blocks`);

        for (const block of selectionBlocks) {
            const selection = this.parseSelectionBlock(block);
            if (selection && selection.odds) {
                selections.push(selection);
                console.log(`✅ Parsed selection: ${selection.team} @ ${selection.odds}`);
            } else {
                console.log(`❌ Failed to parse block: ${JSON.stringify(block.slice(0, 3))}...`);
            }
        }

        return selections;
    }

    groupIntoBlocks(lines) {
        const blocks = [];
        let currentBlock = [];

        for (const line of lines) {
            if (this.isAnchor(line)) {
                // Start new block
                if (currentBlock.length > 0) {
                    blocks.push([...currentBlock]);
                }
                currentBlock = [line];
                console.log(`📍 Found anchor: "${line}"`);
            } else if (currentBlock.length > 0) {
                // Add to current block
                currentBlock.push(line);
            }
        }

        // Don't forget the last block
        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    isAnchor(line) {
        // Skip obvious non-anchor patterns first
        if (line.match(/^\d+\.\d+$/)) return false; // Pure odds like "1.28"
        if (line.match(/£\d+/)) return false; // Money amounts
        if (line.match(/.*\s+v\s+.*/i)) return false; // Fixture format "Team A v Team B"
        if (line.includes('Full Time Result')) return false; // Market descriptions
        if (line.includes('To Return')) return false; // Betting slip metadata
        if (line.includes('Stake')) return false; // Betting slip metadata
        if (line.includes('Fold')) return false; // Bet type descriptions
        
        const lineNormalized = this.normalizeTeamName(line.toLowerCase());
        
        // Check if line is exactly a betting market term (not just containing it)
        const isBettingMarket = this.bettingMarkets.some(market => 
            lineNormalized === market || line.toLowerCase() === market
        );
        
        // Check if line is primarily a team name (more strict matching)
        const isTeamName = this.knownTeams.some(team => {
            // Exact match
            if (lineNormalized === team) return true;
            // Team name is the primary part of the line
            if (lineNormalized.startsWith(team + ' ') || lineNormalized.endsWith(' ' + team)) return true;
            // Single word match for short team names
            if (team.length >= 4 && lineNormalized === team) return true;
            return false;
        });
        
        // Additional validation
        const hasValidLength = line.length >= 2 && line.length <= 30; // Reduced max length
        
        return (isTeamName || isBettingMarket) && hasValidLength;
    }

    parseSelectionBlock(blockLines) {
        if (!blockLines || blockLines.length === 0) return null;
        
        const selection = {
            team: blockLines[0], // Anchor line is the selection
            odds: null,
            market: 'Unknown',
            opponent: null,
            confidence: 1.0
        };
        
        // Extract odds
        for (const line of blockLines) {
            const oddsMatch = line.match(/(\d{1,2}\.\d{2})/);
            if (oddsMatch && !selection.odds) {
                selection.odds = parseFloat(oddsMatch[1]);
                break;
            }
        }
        
        // Extract fixture (Team A v Team B)
        for (const line of blockLines) {
            const fixtureMatch = line.match(/(.+)\s+v\s+(.+)/i);
            if (fixtureMatch) {
                const team1 = fixtureMatch[1].trim();
                const team2 = fixtureMatch[2].trim();
                
                // Determine opponent
                const selectionNorm = this.normalizeTeamName(selection.team);
                const team1Norm = this.normalizeTeamName(team1);
                const team2Norm = this.normalizeTeamName(team2);
                
                if (team1Norm.includes(selectionNorm) || selectionNorm.includes(team1Norm)) {
                    selection.opponent = team2;
                } else if (team2Norm.includes(selectionNorm) || selectionNorm.includes(team2Norm)) {
                    selection.opponent = team1;
                }
                break;
            }
        }
        
        // Extract market type
        selection.market = this.extractMarket(blockLines);
        
        return selection;
    }

    extractMarket(blockLines) {
        for (const line of blockLines) {
            const lineLower = line.toLowerCase();
            if (lineLower.includes('full time result')) return 'Full Time Result';
            if (lineLower.includes('double chance')) return 'Double Chance';
            if (lineLower.includes('both teams')) return 'Both Teams To Score';
            if (lineLower.includes('over') || lineLower.includes('under')) return 'Total Goals';
            if (lineLower.includes('correct score')) return 'Correct Score';
            if (lineLower.includes('first goalscorer')) return 'First Goalscorer';
            if (lineLower.includes('anytime goalscorer')) return 'Anytime Goalscorer';
        }
        return 'Unknown';
    }

    parseMatchDate(dateString) {
        try {
            let parsedDate = null;
            
            // Format: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
            const ddmmyyyyMatch = dateString.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
            if (ddmmyyyyMatch) {
                const [, day, month, year] = ddmmyyyyMatch;
                const fullYear = year.length === 2 ? `20${year}` : year;
                parsedDate = new Date(fullYear, month - 1, day);
            }
            
            // Format: dd Mon yyyy (e.g., "13 Jan 2024")
            const ddMonYYYYMatch = dateString.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i);
            if (ddMonYYYYMatch) {
                const [, day, monthStr, year] = ddMonYYYYMatch;
                const monthNames = {
                    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                };
                const month = monthNames[monthStr.toLowerCase().substr(0, 3)];
                const fullYear = year.length === 2 ? `20${year}` : year;
                parsedDate = new Date(fullYear, month, day);
            }
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    }

    normalizeTeamName(name) {
        return name.toLowerCase()
            .replace(/\bfc\b/gi, '')
            .replace(/\bafc\b/gi, '')
            .replace(/\blfc\b/gi, '')
            .replace(/\bcfc\b/gi, '')
            .replace(/\bufc\b/gi, '')
            .replace(/\bssc\b/gi, '')
            .replace(/\bmufc\b/gi, 'manchester united')
            .replace(/\bmcfc\b/gi, 'manchester city')
            .replace(/\bcity\b/gi, '')
            .replace(/\bunited\b/gi, '')
            .replace(/\balbion\b/gi, '')
            .replace(/\bwanderers\b/gi, '')
            .replace(/\brovers\b/gi, '')
            .replace(/\bsc\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

module.exports = new BettingSlipAnalyzer();