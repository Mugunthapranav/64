import ChessBoard from './components/ChessBoard'
import Sidebar from './components/Sidebar'
import TopInstructions from './components/TopInstructions'
import PuzzleControls from './components/PuzzleControls'
import PuzzleSolved from './components/PuzzleSolved'
import Roadmap from './components/Roadmap'
import Navbar from './components/Navbar'
import MoveHistorySidebar from './components/MoveHistorySidebar'
import usePuzzleMode from './hooks/usePuzzleMode'
import useEngineMode from './hooks/useEngineMode'
import './App.css'
import './components/MoveHistorySidebar.css'

function App() {
  // Puzzle mode hook
  const {
    puzzles,
    roadmapData,
    solvedResults,
    currentPuzzle,
    puzzleIndex,
    fen,
    feedback,
    isCompleted,
    resetCounter,
    hintsUsed,
    hintMove: puzzleHintMove,
    isRoadmapOpen,
    setIsRoadmapOpen,
    isInstructionsOpen,
    setIsInstructionsOpen,
    handleUserMove: handlePuzzleMove,
    handleNextPuzzle,
    handleHint: handlePuzzleHint,
    handleAutoMove,
    handleSelectPuzzle,
  } = usePuzzleMode();

  // Engine mode hook
  const {
    isEngineMode,
    engineGame,
    engineHistory,
    engineHistoryEvals,
    difficulty,
    setDifficulty,
    playerColor,
    setPlayerColor,
    hintMove,
    isThinking,
    isHintThinking,
    engineStatus,
    currentEval,
    gameStatus,
    handleEngineMove,
    handleToggleEngineMode,
    handleNewEngineGame,
    handleEngineHint,
    handleUndoMove,
    topMoves,
    lastMoveQuality,
  } = useEngineMode();

  // Unified move handler
  const handleUserMove = (move) => {
    if (isEngineMode) {
      return handleEngineMove(move);
    }
    return handlePuzzleMove(move);
  };

  // Unified hint handler
  const handleHint = () => {
    if (isEngineMode) {
      return handleEngineHint();
    }
    return handlePuzzleHint();
  };

  return (
    <div className="app-container">
      <Navbar
        onOpenRoadmap={() => setIsRoadmapOpen(true)}
        onToggleEngineMode={handleToggleEngineMode}
        isEngineMode={isEngineMode}
      />
      {isRoadmapOpen && (
        <Roadmap
          roadmapData={roadmapData}
          currentPuzzleIndex={puzzleIndex}
          solvedResults={solvedResults}
          onSelect={handleSelectPuzzle}
          onClose={() => setIsRoadmapOpen(false)}
        />
      )}
      <div className="app-body">
        {isEngineMode ? (
          <MoveHistorySidebar
            history={engineHistory}
            historyEvals={engineHistoryEvals}
            onNewGame={handleNewEngineGame}
            isThinking={isThinking || isHintThinking}
            engineStatus={engineStatus}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            playerColor={playerColor}
            onPlayerColorChange={setPlayerColor}
            currentEval={currentEval}
            onHint={handleHint}
            gameStatus={gameStatus}
            topMoves={topMoves}
            onUndo={handleUndoMove}
          />
        ) : (
          <Sidebar
            puzzle={currentPuzzle}
            puzzleIndex={puzzleIndex}
            totalPuzzles={puzzles.length}
            isCompleted={isCompleted}
            hintsUsed={hintsUsed}
            onHint={handleHint}
            onAutoMove={handleAutoMove}
            onNext={handleNextPuzzle}
            onOpenRoadmap={() => setIsRoadmapOpen(true)}
          />
        )}

        <div className="main-content">
          {/* Mobile Puzzle Solved Modal */}
          {!isEngineMode && isCompleted && (
            <div className="mobile-only">
              <PuzzleSolved
                puzzleIndex={puzzleIndex}
                totalPuzzles={puzzles.length}
                hintsUsed={hintsUsed}
                onNext={handleNextPuzzle}
                variant="modal"
              />
            </div>
          )}

          {!isEngineMode && isInstructionsOpen && (
            <div className="mobile-only">
              <TopInstructions
                puzzle={currentPuzzle}
                isCompleted={isCompleted}
                variant="modal"
                onClose={() => setIsInstructionsOpen(false)}
              />
            </div>
          )}

          <main className="app-main">
            <ChessBoard
              key={isEngineMode ? 'engine' : `${currentPuzzle?.PuzzleId || 'empty'}-${resetCounter}`}
              fen={isEngineMode ? engineGame.fen() : fen}
              onMove={handleUserMove}
              orientation={isEngineMode ? playerColor : (currentPuzzle?.Fen.includes(' w ') ? 'w' : 'b')}
              feedback={isEngineMode ? null : feedback}
              hintMove={isEngineMode ? hintMove : puzzleHintMove}
              moveQuality={isEngineMode ? lastMoveQuality : null}
            />
          </main>

          {!isEngineMode && (
            <div className="mobile-only">
              <PuzzleControls
                isCompleted={isCompleted}
                onHint={handleHint}
                onAutoMove={handleAutoMove}
                onToggleInstructions={() => setIsInstructionsOpen(!isInstructionsOpen)}
                showGoal={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
