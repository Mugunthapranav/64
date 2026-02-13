import React from 'react';
import './PromotionModal.css';

const PromotionModal = ({ color, onSelect, onCancel }) => {
    const pieces = [
        { type: 'q', name: 'Queen' },
        { type: 'r', name: 'Rook' },
        { type: 'b', name: 'Bishop' },
        { type: 'n', name: 'Knight' }
    ];

    const getPieceImg = (type) => {
        const typeUpper = type.toUpperCase();
        return `/pieces/${color}${typeUpper}.svg`;
    };

    return (
        <div className="promotion-overlay" onClick={(e) => {
            e.stopPropagation();
            onCancel();
        }}>
            <div className="promotion-modal" onClick={(e) => e.stopPropagation()}>
                <div className="promotion-pieces">
                    {pieces.map(({ type, name }) => (
                        <div
                            key={type}
                            className="promotion-piece"
                            onClick={() => onSelect(type)}
                            title={name}
                        >
                            <img
                                src={getPieceImg(type)}
                                alt={name}
                                className="promotion-piece-img"
                                draggable="false"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PromotionModal;
