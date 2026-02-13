
export async function loadPuzzles() {
    try {
        const response = await fetch('/Mate_Puzzles.csv');
        const csvData = await response.text();

        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvData.length; i++) {
            const char = csvData[i];
            const nextChar = csvData[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
                currentRow.push(currentField.trim());
                if (currentRow.length > 1 || currentRow[0] !== '') {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                if (char === '\r') i++;
            } else {
                currentField += char;
            }
        }
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
        }

        if (rows.length === 0) return [];

        const headers = rows[0];
        const puzzles = rows.slice(1).map(row => {
            const puzzle = {};
            headers.forEach((header, index) => {
                puzzle[header] = row[index];
            });
            return puzzle;
        }).filter(p => p.Fen);

        return puzzles;
    } catch (error) {
        console.error('Error loading puzzles:', error);
        return [];
    }
}


export function getGroupedRoadmap(puzzles) {
    if (!puzzles || puzzles.length === 0) return [];

    const roadmap = [];
    const levelsMap = new Map();

    puzzles.forEach((puzzle, index) => {
        const levelNum = puzzle.Level || "1";
        const mateType = puzzle.MateType || "Unknown";

        if (!levelsMap.has(levelNum)) {
            levelsMap.set(levelNum, {
                level: levelNum,
                parts: new Map()
            });
        }

        const levelData = levelsMap.get(levelNum);
        if (!levelData.parts.has(mateType)) {
            levelData.parts.set(mateType, {
                name: mateType,
                firstPuzzleIndex: index,
                puzzleIds: [],
                puzzleCount: 0
            });
        }

        const part = levelData.parts.get(mateType);
        part.puzzleIds.push(puzzle.PuzzleId);
        part.puzzleCount++;
    });

    return Array.from(levelsMap.values())
        .map(levelData => ({
            ...levelData,
            parts: Array.from(levelData.parts.values())
        }))
        .sort((a, b) => parseInt(a.level, 10) - parseInt(b.level, 10));
}

