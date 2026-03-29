import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../../components/Pagination';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

describe('Pagination Component', () => {
  const renderWithI18n = (component: React.ReactNode) => {
    return render(
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    );
  };

  it('renders pagination with correct page info', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText(/1-10/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('renders page numbers correctly', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    // Check if page numbers are rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onPageChange when clicking next page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    const nextButton = screen.getByTitle(/next/i);
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking previous page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    const prevButton = screen.getByTitle(/previous/i);
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    const page3Button = screen.getByText('3');
    fireEvent.click(page3Button);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    const prevButton = screen.getByTitle(/previous/i);
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    const nextButton = screen.getByTitle(/next/i);
    expect(nextButton).toBeDisabled();
  });

  it('renders page size selector when onPageSizeChange is provided', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByDisplayValue('10');
    expect(select).toBeInTheDocument();
  });

  it('calls onPageSizeChange when selecting different page size', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByDisplayValue('10');
    fireEvent.change(select, { target: { value: '20' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it('returns null when only one page and few items', () => {
    const onPageChange = vi.fn();
    const { container } = renderWithI18n(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders ellipsis for many pages', () => {
    const onPageChange = vi.fn();
    renderWithI18n(
      <Pagination
        currentPage={5}
        totalPages={10}
        totalItems={100}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    // Check for ellipsis elements
    const ellipsisElements = screen.getAllByText('...');
    expect(ellipsisElements.length).toBeGreaterThanOrEqual(0);
  });
});
