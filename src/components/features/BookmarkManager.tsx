// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { Report } from 'powerbi-client';
import './BookmarkManager.css';

interface Bookmark {
    id: string;
    name: string;
    displayName: string;
    reportId: string;
    reportName: string;
    createdAt: Date;
    isFavorite: boolean;
}

interface BookmarkManagerProps {
    report: Report | null;
    reportId: string;
    reportName: string;
    isVisible: boolean;
    onClose: () => void;
}

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
    report,
    reportId,
    reportName,
    isVisible,
    onClose
}) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [reportBookmarks, setReportBookmarks] = useState<any[]>([]);
    const [selectedBookmark, setSelectedBookmark] = useState<string | null>(null);
    const [newBookmarkName, setNewBookmarkName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Load saved bookmarks from localStorage
    useEffect(() => {
        const savedBookmarks = localStorage.getItem('powerbi-bookmarks');
        if (savedBookmarks) {
            try {
                setBookmarks(JSON.parse(savedBookmarks));
            } catch (error) {
                console.error('Error loading bookmarks:', error);
            }
        }
    }, []);

    // Load report bookmarks when report changes
    useEffect(() => {
        if (report && isVisible) {
            loadReportBookmarks();
        }
    }, [report, isVisible]);

    const loadReportBookmarks = async () => {
        if (!report) return;
        
        setIsLoading(true);
        try {
            const bookmarksResponse = await report.bookmarksManager.getBookmarks();
            setReportBookmarks(bookmarksResponse || []);
        } catch (error) {
            console.error('Error loading report bookmarks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveBookmarks = (updatedBookmarks: Bookmark[]) => {
        setBookmarks(updatedBookmarks);
        localStorage.setItem('powerbi-bookmarks', JSON.stringify(updatedBookmarks));
    };

    const handleApplyBookmark = async (bookmarkId: string) => {
        if (!report) return;

        setSelectedBookmark(bookmarkId);
        try {
            await report.bookmarksManager.apply(bookmarkId);
        } catch (error) {
            console.error('Error applying bookmark:', error);
        }
    };

    const handleCaptureBookmark = async () => {
        if (!report || !newBookmarkName.trim()) return;

        setIsLoading(true);
        try {
            const bookmarkResult = await report.bookmarksManager.capture({
                displayName: newBookmarkName.trim()
            } as any);

            const newBookmark: Bookmark = {
                id: bookmarkResult.name,
                name: bookmarkResult.name,
                displayName: newBookmarkName.trim(),
                reportId,
                reportName,
                createdAt: new Date(),
                isFavorite: false
            };

            const updatedBookmarks = [...bookmarks, newBookmark];
            saveBookmarks(updatedBookmarks);
            setNewBookmarkName('');
            
            // Refresh report bookmarks
            await loadReportBookmarks();
        } catch (error) {
            console.error('Error capturing bookmark:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleFavorite = (bookmarkId: string) => {
        const updatedBookmarks = bookmarks.map(bookmark =>
            bookmark.id === bookmarkId
                ? { ...bookmark, isFavorite: !bookmark.isFavorite }
                : bookmark
        );
        saveBookmarks(updatedBookmarks);
    };

    const handleDeleteBookmark = (bookmarkId: string) => {
        const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
        saveBookmarks(updatedBookmarks);
    };

    const currentReportBookmarks = bookmarks.filter(bookmark => bookmark.reportId === reportId);
    const favoriteBookmarks = currentReportBookmarks.filter(bookmark => bookmark.isFavorite);

    if (!isVisible) return null;

    return (
        <div className="bookmark-manager-overlay">
            <div className="bookmark-manager">
                <div className="bookmark-header">
                    <h3>🔖 Bookmark Manager</h3>
                    <button onClick={onClose} className="close-button">✕</button>
                </div>

                <div className="bookmark-content">
                    {/* Create New Bookmark */}
                    <div className="bookmark-section">
                        <h4>📌 Create Bookmark</h4>
                        <div className="bookmark-create">
                            <input
                                type="text"
                                placeholder="Enter bookmark name..."
                                value={newBookmarkName}
                                onChange={(e) => setNewBookmarkName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCaptureBookmark()}
                            />
                            <button
                                onClick={handleCaptureBookmark}
                                disabled={!newBookmarkName.trim() || isLoading}
                                className="capture-button"
                            >
                                {isLoading ? '⏳' : '💾'} Capture
                            </button>
                        </div>
                    </div>

                    {/* Favorite Bookmarks */}
                    {favoriteBookmarks.length > 0 && (
                        <div className="bookmark-section">
                            <h4>⭐ Favorite Bookmarks</h4>
                            <div className="bookmark-list">
                                {favoriteBookmarks.map((bookmark) => (
                                    <div
                                        key={bookmark.id}
                                        className={`bookmark-item ${selectedBookmark === bookmark.id ? 'selected' : ''}`}
                                    >
                                        <div className="bookmark-info">
                                            <span className="bookmark-name">{bookmark.displayName}</span>
                                            <span className="bookmark-date">
                                                {new Date(bookmark.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="bookmark-actions">
                                            <button
                                                onClick={() => handleApplyBookmark(bookmark.id)}
                                                className="apply-button"
                                                title="Apply bookmark"
                                            >
                                                📖
                                            </button>
                                            <button
                                                onClick={() => handleToggleFavorite(bookmark.id)}
                                                className="favorite-button active"
                                                title="Remove from favorites"
                                            >
                                                ⭐
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBookmark(bookmark.id)}
                                                className="delete-button"
                                                title="Delete bookmark"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Bookmarks */}
                    <div className="bookmark-section">
                        <h4>📚 All Bookmarks ({currentReportBookmarks.length})</h4>
                        {currentReportBookmarks.length > 0 ? (
                            <div className="bookmark-list">
                                {currentReportBookmarks.map((bookmark) => (
                                    <div
                                        key={bookmark.id}
                                        className={`bookmark-item ${selectedBookmark === bookmark.id ? 'selected' : ''}`}
                                    >
                                        <div className="bookmark-info">
                                            <span className="bookmark-name">{bookmark.displayName}</span>
                                            <span className="bookmark-date">
                                                {new Date(bookmark.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="bookmark-actions">
                                            <button
                                                onClick={() => handleApplyBookmark(bookmark.id)}
                                                className="apply-button"
                                                title="Apply bookmark"
                                            >
                                                📖
                                            </button>
                                            <button
                                                onClick={() => handleToggleFavorite(bookmark.id)}
                                                className={`favorite-button ${bookmark.isFavorite ? 'active' : ''}`}
                                                title={bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                {bookmark.isFavorite ? '⭐' : '☆'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBookmark(bookmark.id)}
                                                className="delete-button"
                                                title="Delete bookmark"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-bookmarks">
                                <p>No bookmarks for this report yet</p>
                                <p>Create your first bookmark to save the current view</p>
                            </div>
                        )}
                    </div>

                    {/* Report Bookmarks (PowerBI built-in) */}
                    {reportBookmarks.length > 0 && (
                        <div className="bookmark-section">
                            <h4>🏢 Report Bookmarks ({reportBookmarks.length})</h4>
                            <div className="bookmark-list">
                                {reportBookmarks.map((bookmark) => (
                                    <div
                                        key={bookmark.name}
                                        className={`bookmark-item ${selectedBookmark === bookmark.name ? 'selected' : ''}`}
                                    >
                                        <div className="bookmark-info">
                                            <span className="bookmark-name">{bookmark.displayName}</span>
                                            <span className="bookmark-type">Built-in</span>
                                        </div>
                                        <div className="bookmark-actions">
                                            <button
                                                onClick={() => handleApplyBookmark(bookmark.name)}
                                                className="apply-button"
                                                title="Apply bookmark"
                                            >
                                                📖
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
