import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, ThemeProvider } from '../../context/ThemeContext.jsx';

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide default theme', () => {
    const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('default');
  });

  it('should set theme and persist to localStorage', () => {
    const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('night');
    });

    expect(result.current.theme).toBe('night');
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'night');
  });

  it('should switch between themes', () => {
    const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('night');
    });
    expect(result.current.theme).toBe('night');

    act(() => {
      result.current.setTheme('day');
    });
    expect(result.current.theme).toBe('day');

    act(() => {
      result.current.setTheme('default');
    });
    expect(result.current.theme).toBe('default');
  });

  it('should retrieve theme from localStorage on mount', () => {
    localStorage.getItem.mockReturnValue('night');
    
    const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('night');
  });
});
