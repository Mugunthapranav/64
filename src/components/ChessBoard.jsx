import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import PromotionModal from './PromotionModal';
import './ChessBoard.css';

const ChessBoard = ({
    fen,
    onMove,
    orientation = 'w',
    feedback = null,
    hintMove = null,
    moveQuality = null
}) => {
    const getInitialGame = useCallback(() => {
        try {
            if (!fen || fen === 'start') return new Chess();
            return new Chess(fen);
        } catch (e) {
            console.error('Invalid FEN provided:', fen);
            return new Chess();
        }
    }, [fen]);

    const [game, setGame] = useState(getInitialGame);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to, color }

    // Sync game state when FEN changes externally
    useEffect(() => {
        setGame(getInitialGame());
        setSelectedSquare(null);
        setPossibleMoves([]);
        setPendingPromotion(null);
    }, [fen, getInitialGame]);

    // Helper to get square coordinates (0-100)
    const getSquareCoords = useCallback((square) => {
        if (!square) return null;
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
        const displayFiles = orientation === 'w' ? files : [...files].reverse();

        const fileIdx = displayFiles.indexOf(square[0]);
        const rankIdx = ranks.indexOf(parseInt(square[1]));

        // Return center of square in percentage
        return {
            x: (fileIdx * 12.5) + 6.25,
            y: (rankIdx * 12.5) + 6.25
        };
    }, [orientation]);

    const board = useMemo(() => {
        const matrix = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

        const displayFiles = orientation === 'w'
            ? files
            : [...files].reverse();

        for (const r of ranks) {
            const row = [];
            for (const f of displayFiles) {
                const square = f + r;
                const piece = game.get(square);

                let isCheck = false;
                let isCheckmate = false;
                let kingStatus = null; // 'check', 'lost', 'win'

                if (piece && piece.type === 'k') {
                    if (piece.color === game.turn()) {
                        if (game.isCheckmate()) {
                            isCheckmate = true;
                            kingStatus = 'lost';
                        } else if (game.inCheck()) {
                            isCheck = true;
                            kingStatus = 'check';
                        }
                    } else if (game.isCheckmate()) {
                        kingStatus = 'win';
                    }
                }

                row.push({
                    square,
                    piece: piece || null,
                    isDark: (files.indexOf(f) + (r - 1)) % 2 === 0,
                    isCheck,
                    isCheckmate,
                    kingStatus
                });
            }
            matrix.push(row);
        }
        return matrix;
    }, [game, orientation]);

    // Check if a move is a promotion
    const isPromotionMove = useCallback((from, to) => {
        const piece = game.get(from);
        if (!piece || piece.type !== 'p') return false;

        const targetRank = to[1];
        if (piece.color === 'w' && targetRank === '8') return true;
        if (piece.color === 'b' && targetRank === '1') return true;

        return false;
    }, [game]);

    // Execute move with optional promotion piece
    const executeMove = useCallback((from, to, promotion = null) => {
        try {
            const moveOptions = { from, to };
            if (promotion) {
                moveOptions.promotion = promotion;
            }

            const move = game.move(moveOptions);
            if (move) {
                setGame(new Chess(game.fen()));
                onMove(move);
                return true;
            }
        } catch (e) {
            // Invalid move - silently fail
        }
        return false;
    }, [game, onMove]);

    const handleSquareClick = (square) => {
        // Don't allow clicks while promotion modal is open
        if (pendingPromotion) return;

        if (selectedSquare === square) {
            setSelectedSquare(null);
            setPossibleMoves([]);
            return;
        }

        const piece = game.get(square);

        // Select piece if it's the turn color
        if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setPossibleMoves(moves.map(m => m.to));
            return;
        }

        // Try to move if a square is selected
        if (selectedSquare) {
            // Check if this is a promotion move
            if (isPromotionMove(selectedSquare, square)) {
                // Verify the move is legal first
                const legalMoves = game.moves({ square: selectedSquare, verbose: true });
                const isLegal = legalMoves.some(m => m.to === square);

                if (isLegal) {
                    const movingPiece = game.get(selectedSquare);
                    setPendingPromotion({
                        from: selectedSquare,
                        to: square,
                        color: movingPiece.color
                    });
                    // Don't clear selection yet - we need to wait for promotion choice
                    return;
                }
            }

            // Regular move (non-promotion)
            executeMove(selectedSquare, square);
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    };

    // Handle promotion piece selection
    const handlePromotionSelect = (pieceType) => {
        if (pendingPromotion) {
            executeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
            setPendingPromotion(null);
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    };

    // Handle promotion cancel
    const handlePromotionCancel = () => {
        setPendingPromotion(null);
        setSelectedSquare(null);
        setPossibleMoves([]);
    };

    // --- HTML5 Drag and Drop Handlers ---

    const onDragStart = (e, square) => {
        // Don't allow dragging if promotion is pending
        if (pendingPromotion) {
            e.preventDefault();
            return;
        }

        const piece = game.get(square);
        // Only allow dragging if it's the current player's turn
        if (piece && piece.color === game.turn()) {
            e.dataTransfer.setData('text/plain', square);
            e.dataTransfer.effectAllowed = 'move';

            // Re-use click logic for showing possible moves
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setPossibleMoves(moves.map(m => m.to));
        } else {
            e.preventDefault();
        }
    };

    const onDragOver = (e) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e, targetSquare) => {
        e.preventDefault();
        const fromSquare = e.dataTransfer.getData('text/plain');

        if (fromSquare) {
            // Check if this is a promotion move
            if (isPromotionMove(fromSquare, targetSquare)) {
                // Verify the move is legal first
                const legalMoves = game.moves({ square: fromSquare, verbose: true });
                const isLegal = legalMoves.some(m => m.to === targetSquare);

                if (isLegal) {
                    const movingPiece = game.get(fromSquare);
                    setPendingPromotion({
                        from: fromSquare,
                        to: targetSquare,
                        color: movingPiece.color
                    });
                    return;
                }
            }

            // Regular move execution
            const success = executeMove(fromSquare, targetSquare);

            // Clean up state regardless of success (unless promotion)
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    };

    const getPieceImg = (piece) => {
        if (!piece) return null;
        const { color, type } = piece;
        const typeUpper = type.toUpperCase();
        return `/pieces/${color}${typeUpper}.svg`;
    };

    return (
        <div className="chess-board-outer">
            <div className="chess-board-container">
                <div className="chess-board">
                    {board.map((row, rowIndex) => (
                        <div key={rowIndex} className="board-row">
                            {row.map((cell) => (
                                <div
                                    key={cell.square}
                                    className={`board-square ${cell.isDark ? 'dark' : 'light'} ${selectedSquare === cell.square ? 'selected' : ''} ${possibleMoves.includes(cell.square) ? 'target' : ''} ${cell.isCheckmate ? 'checkmate' : cell.isCheck ? 'check' : ''}`}
                                    onClick={() => handleSquareClick(cell.square)}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, cell.square)}
                                >
                                    {/* Square Coordinates */}
                                    {((orientation === 'w' && cell.square[0] === 'a') || (orientation === 'b' && cell.square[0] === 'h')) && (
                                        <span className="coord rank-coord">{cell.square[1]}</span>
                                    )}
                                    {((orientation === 'w' && cell.square[1] === '1') || (orientation === 'b' && cell.square[1] === '8')) && (
                                        <span className="coord file-coord">{cell.square[0]}</span>
                                    )}

                                    {/* Piece */}
                                    {cell.piece && (
                                        <div className="piece-wrapper">
                                            <img
                                                src={getPieceImg(cell.piece)}
                                                alt={`${cell.piece.color}${cell.piece.type}`}
                                                className="chess-piece"
                                                draggable="true"
                                                onDragStart={(e) => onDragStart(e, cell.square)}
                                            />
                                        </div>
                                    )}

                                    {/* Move Indicators */}
                                    {possibleMoves.includes(cell.square) && (
                                        <div className={`move-indicator ${cell.piece ? 'capture' : 'dot'}`} />
                                    )}

                                    {/* Feedback Stickers */}
                                    {feedback && feedback.square === cell.square && (
                                        <div className={`move-quality-badge ${feedback.type}`}>
                                            {feedback.type === 'correct' ? '✅' : '❌'}
                                        </div>
                                    )}

                                    {/* Move Quality Badge */}
                                    {moveQuality && moveQuality.square === cell.square && (
                                        <div className={`move-quality-badge ${moveQuality.type}`}>
                                            {moveQuality.type === 'best-1st' && '✨'}
                                            {moveQuality.type === 'best-2nd' && '🌟'}
                                            {moveQuality.type === 'best-3rd' && '⭐'}
                                            {moveQuality.type === 'mistake' && '❌'}
                                        </div>
                                    )}

                                    {/* King Status Badge */}
                                    {cell.kingStatus && (
                                        <div className={`move-quality-badge king-${cell.kingStatus}`}>
                                            {cell.kingStatus === 'check' && '💧'}
                                            {cell.kingStatus === 'lost' && '😔'}
                                            {cell.kingStatus === 'win' && '👑'}
                                        </div>
                                    )}

                                    {/* Promotion Modal - Localized to the square */}
                                    {pendingPromotion && pendingPromotion.to === cell.square && (
                                        <PromotionModal
                                            color={pendingPromotion.color}
                                            onSelect={handlePromotionSelect}
                                            onCancel={handlePromotionCancel}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Hint Arrow Overlay */}
                    {hintMove && (
                        <svg className="hint-arrow-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <marker
                                    id="arrowhead"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="10"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.8)" />
                                </marker>
                            </defs>
                            {(() => {
                                const start = getSquareCoords(hintMove.from);
                                const end = getSquareCoords(hintMove.to);
                                if (!start || !end) return null;

                                return (
                                    <line
                                        x1={`${start.x}`}
                                        y1={`${start.y}`}
                                        x2={`${end.x}`}
                                        y2={`${end.y}`}
                                        stroke="rgba(255, 255, 255, 0.8)"
                                        strokeWidth="2.5"
                                        markerEnd="url(#arrowhead)"
                                        strokeLinecap="round"
                                    />
                                );
                            })()}
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChessBoard;
