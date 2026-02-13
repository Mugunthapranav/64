import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChessBoard from './components/ChessBoard';
import Roadmap from './components/Roadmap';
import MoveHistorySidebar from './components/MoveHistorySidebar';
import GameResult from './components/GameResult';
import ProfileModal from './components/ProfileModal';
import TopInstructions from './components/TopInstructions';
import PuzzleControls from './components/PuzzleControls';
import PuzzleSolved from './components/PuzzleSolved';
import usePuzzleMode from './hooks/usePuzzleMode';
import useEngineMode from './hooks/useEngineMode';
import useXP from './hooks/useXP';
import useProfile from './hooks/useProfile';
import { getAllResults } from './utils/db';
import './App.css';

function App() {
  const { xp, addXP } = useXP();
  const { profile, loading: profileLoading, updateUsername, completeSetup } = useProfile();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    handlePrevPuzzle,
    handleReplayPuzzle,
    handleHint: handlePuzzleHint,
    handleAutoMove,
    handleSelectPuzzle: onPuzzleSelect,
    earnedXP,
    isCurrentPuzzleSolved,
  } = usePuzzleMode(addXP);

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
    gameResult,
    handleEngineMove,
    handleToggleEngineMode,
    handleNewEngineGame,
    handleEngineHint,
    handleUndoMove,
    handleResign,
    handleStartGame,
    isGameActive,
    topMoves,
    lastMoveQuality,
  } = useEngineMode(addXP);

  const puzzlesSolvedCount = useMemo(() => {
    return Object.keys(solvedResults || {}).length;
  }, [solvedResults]);

  const showOnboarding = !profileLoading && profile && !profile.hasSetup;

  const handleUserMove = useCallback((move) => {
    if (isEngineMode) {
      return handleEngineMove(move);
    }
    return handlePuzzleMove(move);
  }, [isEngineMode, handleEngineMove, handlePuzzleMove]);

  const handleHint = useCallback(() => {
    if (isEngineMode) {
      return handleEngineHint();
    }
    return handlePuzzleHint();
  }, [isEngineMode, handleEngineHint, handlePuzzleHint]);

  return (
    <div className="app-container">
      <Navbar
        onOpenRoadmap={() => setIsRoadmapOpen(true)}
        onToggleEngineMode={handleToggleEngineMode}
        isEngineMode={isEngineMode}
        xp={xp}
        streak={profile?.streak || 0}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {isRoadmapOpen && (
        <Roadmap
          roadmapData={roadmapData}
          currentPuzzleIndex={puzzleIndex}
          solvedResults={solvedResults}
          onSelect={(index) => {
            onPuzzleSelect(index);
            setIsRoadmapOpen(false);
          }}
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
            gameResult={gameResult}
            topMoves={topMoves}
            onUndo={handleUndoMove}
            onResign={handleResign}
            onStartGame={handleStartGame}
            isGameActive={isGameActive}
          />
        ) : (
          <Sidebar
            puzzle={currentPuzzle}
            puzzleIndex={puzzleIndex}
            totalPuzzles={puzzles.length}
            isCompleted={isCompleted}
            hintsUsed={hintsUsed}
            earnedXP={earnedXP}
            isCurrentPuzzleSolved={isCurrentPuzzleSolved}
            onHint={handleHint}
            onAutoMove={handleAutoMove}
            onNext={handleNextPuzzle}
            onPrev={handlePrevPuzzle}
            onReplay={handleReplayPuzzle}
            onOpenRoadmap={() => setIsRoadmapOpen(true)}
          />
        )}

        <div className="main-content">
          {!isEngineMode && isCompleted && (
            <div className="mobile-only">
              <PuzzleSolved
                puzzleIndex={puzzleIndex}
                totalPuzzles={puzzles.length}
                hintsUsed={hintsUsed}
                earnedXP={earnedXP}
                isCurrentPuzzleSolved={isCurrentPuzzleSolved}
                onNext={handleNextPuzzle}
                onPrev={handlePrevPuzzle}
                onReplay={handleReplayPuzzle}
                variant="modal"
              />
            </div>
          )}

          {isEngineMode && gameResult && (
            <div className="mobile-only">
              <GameResult
                result={gameResult}
                playerColor={playerColor}
                onNewGame={handleNewEngineGame}
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

      {(isProfileOpen || showOnboarding) && (
        <ProfileModal
          profile={profile}
          xp={xp}
          puzzlesSolved={puzzlesSolvedCount}
          onUpdateName={updateUsername}
          onCompleteSetup={completeSetup}
          onClose={() => setIsProfileOpen(false)}
          isOnboarding={showOnboarding}
        />
      )}
    </div>
  );
}

export default App;
