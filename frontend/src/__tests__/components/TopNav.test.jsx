import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TopNav from '../../components/TopNav.jsx';
import alertsReducer from '../../redux/alertsSlice.js';

// Mock the useTheme hook
vi.mock('../../context/ThemeContext.jsx', () => ({
  useTheme: () => ({
    theme: 'default',
    setTheme: vi.fn()
  })
}));

describe('TopNav Component', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        alerts: alertsReducer,
        auth: (state = { user: { name: 'Test User', role: 'ORG_ADMIN', email: 'test@example.com' } }) => state
      }
    });
  });

  const renderWithRedux = (component) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  it('should render the navigation bar', () => {
    renderWithRedux(<TopNav />);
    
    const brandText = screen.getByText('Logistic 18');
    expect(brandText).toBeInTheDocument();
  });

  it('should display all navigation tabs for admin users', () => {
    renderWithRedux(<TopNav />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Shipments')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should render notification bell', () => {
    renderWithRedux(<TopNav />);
    
    const bellButton = screen.getByLabelText('Notifications');
    expect(bellButton).toBeInTheDocument();
  });

  it('should render user avatar with first letter', () => {
    renderWithRedux(<TopNav />);
    
    const avatar = screen.getByText('T');
    expect(avatar).toBeInTheDocument();
  });

  it('should show user menu when avatar is clicked', async () => {
    renderWithRedux(<TopNav />);
    
    const avatarButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(avatarButton);
    
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('should render theme toggle button', () => {
    renderWithRedux(<TopNav />);
    
    const themeToggle = screen.getByRole('button', { name: /switch to|dark mode|light mode/i });
    expect(themeToggle).toBeInTheDocument();
  });
});
