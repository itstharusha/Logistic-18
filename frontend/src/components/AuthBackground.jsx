/**
 * AuthBackground.jsx — Animated Slideshow Background for Auth Pages
 *
 * Responsibility:
 *   Provides the full-page animated background used on the Login and Register pages.
 *   Displays a slideshow of background images (imported from assets/auth-bg/index.js)
 *   with a smooth crossfade transition between images.
 *
 *   Interaction:
 *   - Clicking anywhere on the page triggers a transition to the next image.
 *   - A subtle hint text is shown at the bottom if there is more than one image.
 *   - While a transition is in progress, additional clicks are ignored (isTransitioning guard).
 *
 *   Layout:
 *   - The slideshow is rendered as CSS background-image divs (hardware-accelerated).
 *   - A dark overlay (.slideshow-overlay) sits above the images to improve text contrast.
 *   - The auth form (children) is rendered in .auth-content-layer above the overlay.
 *
 *   The transition duration (800ms) must match the CSS transition in styles/auth.css.
 */

import React, { useState } from 'react';
import { authImages } from '../assets/auth-bg/index.js';

/**
 * AuthBackground
 * Wrapper component for auth pages that provides the animated image slideshow.
 *
 * @param {React.ReactNode} children - The login or register form to render on top
 */
export default function AuthBackground({ children }) {
    // Index of the currently visible image
    const [currentIndex, setCurrentIndex] = useState(0);

    // Index of the image that is fading IN (null when not transitioning)
    const [nextIndex, setNextIndex] = useState(null);

    // Prevents multiple transitions from running at the same time
    const [isTransitioning, setIsTransitioning] = useState(false);

    /**
     * changeImage
     * Triggers a crossfade transition to the next image in the array.
     * - Calculates the next index (wraps around at the end).
     * - Sets isTransitioning=true to block concurrent transitions.
     * - After the CSS transition completes (800ms), updates currentIndex.
     */
    const changeImage = () => {
        // Prevent triggering while already transitioning, or if there's only one image
        if (isTransitioning || authImages.length <= 1) return;

        const nextIdx = (currentIndex + 1) % authImages.length;
        setNextIndex(nextIdx);       // Mark the incoming image
        setIsTransitioning(true);    // Lock out further clicks

        // Wait for the CSS fade to complete, then commit the new state
        setTimeout(() => {
            setCurrentIndex(nextIdx);  // Make the incoming image the current one
            setNextIndex(null);        // Clear the 'incoming' marker
            setIsTransitioning(false); // Allow clicks again
        }, 800); // Must match CSS transition-duration
    };

    return (
        <div className="auth-page-wrapper" onClick={changeImage}>

            {/* Slideshow image layers — only the active and incoming slides are visible */}
            <div className="slideshow-container">
                {authImages.map((img, index) => (
                    <div
                        key={index}
                        className={`slide ${index === currentIndex ? 'active' : ''} ${index === nextIndex ? 'incoming' : ''}`}
                        style={{ backgroundImage: `url("${img}")` }}
                    />
                ))}

                {/* Semi-transparent dark overlay to ensure auth form text is readable */}
                <div className="slideshow-overlay" />
            </div>

            {/* Login / Register form rendered above the slideshow */}
            <div className="auth-content-layer">
                {children}
            </div>

            {/* Hint text shown at the bottom when multiple images are available */}
            {authImages.length > 1 && (
                <div className="slideshow-hint">Click anywhere to change background</div>
            )}

        </div>
    );
}
