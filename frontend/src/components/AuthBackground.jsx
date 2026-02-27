import React, { useState, useEffect } from 'react';
import { authImages } from '../assets/auth-bg/index.js';

export default function AuthBackground({ children }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const changeImage = () => {
        if (isTransitioning || authImages.length <= 1) return;

        const nextIdx = (currentIndex + 1) % authImages.length;
        setNextIndex(nextIdx);
        setIsTransitioning(true);

        // Transition duration matches CSS
        setTimeout(() => {
            setCurrentIndex(nextIdx);
            setNextIndex(null);
            setIsTransitioning(false);
        }, 800);
    };

    return (
        <div className="auth-page-wrapper" onClick={changeImage}>
            <div className="slideshow-container">
                {authImages.map((img, index) => (
                    <div
                        key={index}
                        className={`slide ${index === currentIndex ? 'active' : ''} ${index === nextIndex ? 'incoming' : ''}`}
                        style={{ backgroundImage: `url("${img}")` }}
                    />
                ))}
                <div className="slideshow-overlay" />
            </div>
            <div className="auth-content-layer">
                {children}
            </div>
            {authImages.length > 1 && (
                <div className="slideshow-hint">Click anywhere to change background</div>
            )}
        </div>
    );
}
