// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import './ReportSearch.css';

interface ReportSearchProps {
    onSearchTermChange: (searchTerm: string) => void;
    onFilterChange: (filters: SearchFilters) => void;
    totalReports: number;
    filteredReports: number;
    availableWorkspaces?: string[];
}

interface SearchFilters {
    workspace: string;
    type: string;
    dateRange: string;
    favorite: boolean;
}

export const ReportSearch: React.FC<ReportSearchProps> = ({
    onSearchTermChange,
    onFilterChange,
    totalReports,
    filteredReports,
    availableWorkspaces = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<SearchFilters>({
        workspace: '',
        type: '',
        dateRange: '',
        favorite: false
    });
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        onSearchTermChange(searchTerm);
    }, [searchTerm, onSearchTermChange]);

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof SearchFilters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            workspace: '',
            type: '',
            dateRange: '',
            favorite: false
        });
    };

    const hasActiveFilters = searchTerm || 
        filters.workspace || 
        filters.type || 
        filters.dateRange || 
        filters.favorite;

    return (
        <div className="report-search">
            <div className="search-main">
                <div className="search-input-container">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search reports, workspaces, or datasets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="clear-search"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`filter-toggle ${isExpanded ? 'expanded' : ''}`}
                    title="Advanced filters"
                >
                    🎛️ Filters
                    {hasActiveFilters && <span className="filter-badge">•</span>}
                </button>

                <div className="search-stats">
                    <span className="results-count">
                        {filteredReports} of {totalReports} reports
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="search-filters">
                    <div className="filter-grid">
                        <div className="filter-group">
                            <label className="filter-label">Workspace</label>
                            <select
                                value={filters.workspace}
                                onChange={(e) => handleFilterChange('workspace', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All workspaces</option>
                                {availableWorkspaces.map(workspace => (
                                    <option key={workspace} value={workspace}>
                                        {workspace}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Report Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All types</option>
                                <option value="PowerBI">PowerBI Reports</option>
                                <option value="Excel">Excel Reports</option>
                                <option value="Paginated">Paginated Reports</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">Date Range</label>
                            <select
                                value={filters.dateRange}
                                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All time</option>
                                <option value="today">Today</option>
                                <option value="week">This week</option>
                                <option value="month">This month</option>
                                <option value="quarter">This quarter</option>
                                <option value="year">This year</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked={filters.favorite}
                                    onChange={(e) => handleFilterChange('favorite', e.target.checked)}
                                />
                                <span className="checkbox-text">⭐ Favorites only</span>
                            </label>
                        </div>
                    </div>

                    <div className="filter-actions">
                        <button
                            onClick={clearFilters}
                            className="clear-filters"
                            disabled={!hasActiveFilters}
                        >
                            🗑️ Clear Filters
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="collapse-filters"
                        >
                            ⬆️ Collapse
                        </button>
                    </div>
                </div>
            )}

            {/* Quick filter chips */}
            {hasActiveFilters && (
                <div className="active-filters">
                    {searchTerm && (
                        <div className="filter-chip">
                            <span>Search: "{searchTerm}"</span>
                            <button onClick={() => setSearchTerm('')}>✕</button>
                        </div>
                    )}
                    {filters.workspace && (
                        <div className="filter-chip">
                            <span>Workspace: {filters.workspace}</span>
                            <button onClick={() => handleFilterChange('workspace', '')}>✕</button>
                        </div>
                    )}
                    {filters.type && (
                        <div className="filter-chip">
                            <span>Type: {filters.type}</span>
                            <button onClick={() => handleFilterChange('type', '')}>✕</button>
                        </div>
                    )}
                    {filters.dateRange && (
                        <div className="filter-chip">
                            <span>Date: {filters.dateRange}</span>
                            <button onClick={() => handleFilterChange('dateRange', '')}>✕</button>
                        </div>
                    )}
                    {filters.favorite && (
                        <div className="filter-chip">
                            <span>⭐ Favorites</span>
                            <button onClick={() => handleFilterChange('favorite', false)}>✕</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
