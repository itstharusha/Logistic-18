import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KPICard from '../../components/KPICard.jsx';

describe('KPICard Component', () => {
  it('should render the KPI card with title', () => {
    render(
      <KPICard
        title="Total Orders"
        value="1,234"
        change="+12%"
        icon="📦"
      />
    );

    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should display positive change in green', () => {
    const { container } = render(
      <KPICard
        title="Revenue"
        value="$50,000"
        change="+15%"
        icon="💰"
        trend="positive"
      />
    );

    const changeElement = screen.getByText('+15%');
    expect(changeElement).toHaveClass('positive');
  });

  it('should display negative change in red', () => {
    render(
      <KPICard
        title="Costs"
        value="$5,000"
        change="-5%"
        icon="📉"
        trend="negative"
      />
    );

    const changeElement = screen.getByText('-5%');
    expect(changeElement).toHaveClass('negative');
  });

  it('should render custom icon', () => {
    const { container } = render(
      <KPICard
        title="Test"
        value="100"
        change="0%"
        icon="🎯"
      />
    );

    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should handle missing optional props', () => {
    render(
      <KPICard
        title="Simple Card"
        value="42"
      />
    );

    expect(screen.getByText('Simple Card')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
