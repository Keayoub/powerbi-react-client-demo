// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { Report } from 'powerbi-client';
import './BookmarkSelector.css';

interface BookmarkOption {
    id: string;
    name: string;
    displayName: string;
    type: 'custom' | 'builtin';
}

interface BookmarkSelectorProps {
    report: Report | null;
    reportId: string;
    reportName: string;
    isVisible: boolean;
    onClose: () => void;
    onSelectBookmark: (bookmark: BookmarkOption | null) => void;
    selectedBookmark?: string | null;
}

export const BookmarkSelector: React.FC<BookmarkSelectorProps> = ({
    report,
    reportId,
    reportName,
    isVisible,
    onClose,
    onSelectBookmark,
    selectedBookmark
}) => {
    const [bookmarks, setBookmarks] = useState<BookmarkOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(selectedBookmark || null);

    useEffect(() => {
        if (isVisible && report) {
            loadBookmarks();
        }
    }, [isVisible, report]);

    const loadBookmarks = async () => {
        if (!report) return;
        
        setIsLoading(true);
        try {
            // Load saved custom bookmarks from localStorage
            const savedBookmarks = localStorage.getItem('powerbi-bookmarks');
            const customBookmarks: BookmarkOption[] = [];
            
            if (savedBookmarks) {
                const allSaved = JSON.parse(savedBookmarks);
                const reportBookmarks = allSaved.filter((b: any) => b.reportId === reportId);
                customBookmarks.push(...reportBookmarks.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    displayName: b.displayName,
                    type: 'custom' as const
                })));
            }

            // Load built-in report bookmarks
            const reportBookmarks = await report.bookmarksManager.getBookmarks();
            const builtinBookmarks: BookmarkOption[] = reportBookmarks.map((b: any) => ({
                id: b.name,
                name: b.name,
                displayName: b.displayName || b.name,
                type: 'builtin' as const
            }));

            setBookmarks([...customBookmarks, ...builtinBookmarks]);
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBookmark = (bookmark: BookmarkOption | null) => {
        setSelectedId(bookmark?.id || null);
    };

    const handleConfirm = () => {
        const selectedBookmark = bookmarks.find(b => b.id === selectedId) || null;
        onSelectBookmark(selectedBookmark);
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div className="bookmark-selector-overlay">
            <div className="bookmark-selector">
                <div className="selector-header">
                    <h3>🔖 Select Bookmark for {reportName}</h3>
                    <button onClick={onClose} className="close-button">✕</button>
                </div>

                <div className="selector-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading bookmarks...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bookmark-option">
                                <label className="bookmark-label">
                                    <input
                                        type="radio"
                                        name="bookmark"
                                        checked={selectedId === null}
                                        onChange={() => handleSelectBookmark(null)}
                                    />
                                    <div className="option-content">
                                        <span className="option-name">📊 Default View</span>
                                        <span className="option-description">Use the default report view</span>
                                    </div>
                                </label>
                            </div>

                            {bookmarks.length > 0 ? (
                                <>
                                    <div className="section-divider">
                                        <span>Available Bookmarks</span>
                                    </div>
                                    
                                    {bookmarks.map((bookmark) => (
                                        <div key={bookmark.id} className="bookmark-option">
                                            <label className="bookmark-label">
                                                <input
                                                    type="radio"
                                                    name="bookmark"
                                                    checked={selectedId === bookmark.id}
                                                    onChange={() => handleSelectBookmark(bookmark)}
                                                />
                                                <div className="option-content">
                                                    <span className="option-name">
                                                        {bookmark.type === 'custom' ? '⭐' : '🏢'} {bookmark.displayName}
                                                    </span>
                                                    <span className="option-description">
                                                        {bookmark.type === 'custom' ? 'Custom bookmark' : 'Built-in bookmark'}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="no-bookmarks">
                                    <p>No bookmarks available for this report</p>
                                    <p>Create bookmarks in the report viewer to see them here</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="selector-actions">
                    <button onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="confirm-button">
                        Add Report {selectedId ? 'with Bookmark' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
