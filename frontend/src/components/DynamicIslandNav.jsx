import React, { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { useModuleConfig } from "../hooks/useModuleConfig";
import { getModulePathForRole, getModulesForRole } from "../modules/moduleRegistry";
import { useTheme } from "../context/ThemeContext";
import { ChevronRight, ChevronLeft, MoreHorizontal } from "lucide-react";

/**
 * Premium "Dynamic Island" style navigation component.
 * Replaces the traditional sidebar with a sleek, horizontal, centered pill nav.
 */
const DynamicIslandNav = ({ role = "patient" }) => {
    const { enabledMap } = useModuleConfig();
    const { isDark: darkMode } = useTheme();
    const location = useLocation();
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const menuItems = getModulesForRole(role, { enabledMap, sidebarOnly: true });

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        // Initial check after a slight delay to ensure DOM is settled
        const timer = setTimeout(checkScroll, 100);
        window.addEventListener('resize', checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScroll);
        };
    }, [menuItems, location.pathname]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            // Re-check after animation
            setTimeout(checkScroll, 350);
        }
    };

    return (
        <div className="dynamic-island-container">
            <div className={`dynamic-island-wrapper ${darkMode ? 'dark' : 'light'}`}>
                <nav 
                    className="island-nav" 
                    ref={scrollRef} 
                    onScroll={checkScroll}
                >
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const path = getModulePathForRole(item, role);
                        return (
                            <NavLink
                                key={item.key}
                                to={path}
                                className={({ isActive }) => `island-item ${isActive ? 'active' : ''}`}
                            >
                                <div className="island-icon">
                                    <Icon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="island-label">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Left Scroll Indicator */}
                {canScrollLeft && (
                    <>
                        <div className="island-mask left"></div>
                        <button className="island-scroll-btn left pulse-active" onClick={() => scroll('left')}>
                            <ChevronLeft size={16} strokeWidth={3} />
                        </button>
                    </>
                )}

                {/* Right Scroll Indicator */}
                {canScrollRight && (
                    <>
                        <div className="island-mask right"></div>
                        <button className="island-scroll-btn right pulse-active" onClick={() => scroll('right')}>
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </>
                )}
            </div>

            <style>{`
                .dynamic-island-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    padding: 0 1rem;
                    pointer-events: none; /* Let clicks pass through to background if needed */
                }

                .dynamic-island-wrapper {
                    display: flex;
                    align-items: center;
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 999px;
                    padding: 4px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 
                                0 0 0 1px rgba(255, 255, 255, 0.05);
                    max-width: 100%;
                    width: fit-content;
                    pointer-events: auto;
                    position: relative;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    box-sizing: border-box;
                }

                .dynamic-island-wrapper.light {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
                }

                .island-nav {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 0 12px;
                }

                .island-nav::-webkit-scrollbar {
                    display: none;
                }

                .island-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 18px;
                    border-radius: 999px;
                    text-decoration: none;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 700;
                    font-size: 0.85rem;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    white-space: nowrap;
                    position: relative;
                }

                .light .island-item {
                    color: rgba(0, 0, 0, 0.6);
                }

                .island-item:hover {
                    color: rgba(255, 255, 255, 1);
                    background: rgba(255, 255, 255, 0.1);
                }

                .light .island-item:hover {
                    color: rgba(0, 0, 0, 1);
                    background: rgba(0, 0, 0, 0.05);
                }

                .island-item.active {
                    color: #60a5fa;
                    background: rgba(96, 165, 250, 0.15);
                    box-shadow: none;
                }

                .light .island-item.active {
                    color: #2563eb;
                    background: #EEF4FF;
                    box-shadow: none;
                }

                .island-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .island-label {
                    letter-spacing: -0.01em;
                }

                .island-scroll-btn {
                    position: absolute;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 10;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .light .island-scroll-btn {
                    background: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    color: #000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .island-scroll-btn.left { left: 8px; }
                .island-scroll-btn.right { right: 8px; }

                .island-scroll-btn:hover {
                    transform: scale(1.1);
                    background: #2563eb;
                    color: #fff;
                    border-color: #2563eb;
                }

                /* Masking Gradients */
                .island-mask {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 60px;
                    pointer-events: none;
                    z-index: 5;
                    transition: opacity 0.3s;
                }

                .island-mask.left {
                    left: 0;
                    background: linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, transparent 100%);
                }

                .light .island-mask.left {
                    background: linear-gradient(to right, rgba(255, 255, 255, 0.9) 0%, transparent 100%);
                }

                .island-mask.right {
                    right: 0;
                    background: linear-gradient(to left, rgba(15, 23, 42, 0.9) 0%, transparent 100%);
                }

                .light .island-mask.right {
                    background: linear-gradient(to left, rgba(255, 255, 255, 0.9) 0%, transparent 100%);
                }

                .pulse-active {
                    animation: pulse-border 2s infinite;
                }

                @keyframes pulse-border {
                    0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
                }

                @media (max-width: 768px) {
                    .island-label {
                        display: none;
                    }
                    .island-item {
                        padding: 12px;
                    }
                    .dynamic-island-wrapper {
                        padding: 4px;
                        max-width: calc(100vw - 2rem);
                    }
                    .island-mask { width: 40px; }
                }
            `}</style>
        </div>
    );
};

export default DynamicIslandNav;
