import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';
import KPICard from '../../components/KPICard.jsx';

describe('KPICard Component', () => {
  it('should render the KPI card with label and value', () => {
    render(
      <KPICard
        icon={Package}
        label="Total Orders"
        value={1234}
      />
    );

    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should display positive change with trending up icon', () => {
    const { container } = render(
      <KPICard
        icon={TrendingUp}
        label="Revenue"
        value={50000}
        delta={15}
        deltaPositiveIsGood
      />
    );

    // Check for the delta display
    expect(screen.getByText(/15%/)).toBeInTheDocument();
    // Good change should have 'good' class
    const deltaElement = container.querySelector('.an-kpi-delta.good');
    expect(deltaElement).toBeInTheDocument();
  });

  it('should display negative change with trending down icon', () => {
    const { container } = render(
      <KPICard
        icon={TrendingDown}
        label="Costs"
        value={5000}
        delta={-5}
        deltaPositiveIsGood={false}
      />
    );

    // Negative delta is good when deltaPositiveIsGood is false
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    const deltaElement = container.querySelector('.an-kpi-delta.good');
    expect(deltaElement).toBeInTheDocument();
  });

  it('should render with custom icon component', () => {
    const { container } = render(
      <KPICard
        icon={Package}
        label="Test"
        value={100}
      />
    );

    // Check that the icon container exists
    const iconContainer = container.querySelector('.an-kpi-icon');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render loading skeleton state', () => {
    const { container } = render(
      <KPICard
        icon={Package}
        label="Test"
        value={100}
        loading={true}
      />
    );

    // Should render skeleton elements
    const skeletons = container.querySelectorAll('.an-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render with unit suffix', () => {
    render(
      <KPICard
        icon={Package}
        label="Completion Rate"
        value={95}
        unit="%"
      />
    );

    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should render without delta when not provided', () => {
    const { container } = render(
      <KPICard
        icon={Package}
        label="Simple Metric"
        value={42}
      />
    );

    const deltaElement = container.querySelector('.an-kpi-delta');
    expect(deltaElement).not.toBeInTheDocument();
  });

  it('should format large numbers with commas', () => {
    render(
      <KPICard
        icon={Package}
        label="Large Number"
        value={1000000}
      />
    );

    expect(screen.getByText('1,000,000')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <KPICard
        icon={Package}
        label="Test"
        value={100}
        description="This is a description"
      />
    );

    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });
});
