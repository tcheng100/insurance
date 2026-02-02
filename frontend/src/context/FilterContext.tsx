import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Filters, FilterOptions } from '../types';
import { getFilterOptions } from '../utils/api';

interface FilterContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  updateFilter: (key: keyof Filters, value: string | number | undefined) => void;
  clearFilters: () => void;
  filterOptions: FilterOptions | null;
  loading: boolean;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  groupBy: string;
  setGroupBy: (field: string) => void;
  crossGroupBy: string | null;
  setCrossGroupBy: (field: string | null) => void;
  refreshOptions: () => Promise<void>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const defaultFilters: Filters = {};

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [groupBy, setGroupBy] = useState('region');
  const [crossGroupBy, setCrossGroupBy] = useState<string | null>(null);

  const loadFilterOptions = async () => {
    setLoading(true);
    try {
      const options = await getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const updateFilter = (key: keyof Filters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const refreshOptions = async () => {
    await loadFilterOptions();
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        updateFilter,
        clearFilters,
        filterOptions,
        loading,
        selectedYear,
        setSelectedYear,
        groupBy,
        setGroupBy,
        crossGroupBy,
        setCrossGroupBy,
        refreshOptions,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
