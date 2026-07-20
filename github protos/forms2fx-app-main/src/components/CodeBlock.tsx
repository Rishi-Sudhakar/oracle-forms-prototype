import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-plsql';

interface CodeBlockProps {
    code: string;
    language?: 'plsql' | 'sql' | 'javascript';
    title?: string;
    showLineNumbers?: boolean;
    maxHeight?: number;
}

export default function CodeBlock({
    code,
    language = 'plsql',
    title,
    showLineNumbers = true,
    maxHeight = 400,
}: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatch, setCurrentMatch] = useState(0);
    const [matches, setMatches] = useState<number[]>([]);
    const codeRef = useRef<HTMLElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Apply syntax highlighting with custom theme
    useEffect(() => {
        if (codeRef.current) {
            Prism.highlightElement(codeRef.current);
        }
    }, [code, searchQuery]);

    // Handle keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                // Check if focus is within this code block
                if (containerRef.current?.contains(document.activeElement) ||
                    containerRef.current?.matches(':hover')) {
                    e.preventDefault();
                    setShowSearch(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                }
            }
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showSearch]);

    // Find matches when search query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setMatches([]);
            setCurrentMatch(0);
            return;
        }

        const lowerCode = code.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        const foundMatches: number[] = [];
        let pos = 0;

        while ((pos = lowerCode.indexOf(lowerQuery, pos)) !== -1) {
            foundMatches.push(pos);
            pos += lowerQuery.length;
        }

        setMatches(foundMatches);
        setCurrentMatch(foundMatches.length > 0 ? 1 : 0);
    }, [searchQuery, code]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const goToNextMatch = () => {
        if (matches.length > 0) {
            setCurrentMatch((prev) => (prev >= matches.length ? 1 : prev + 1));
        }
    };

    const goToPrevMatch = () => {
        if (matches.length > 0) {
            setCurrentMatch((prev) => (prev <= 1 ? matches.length : prev - 1));
        }
    };

    // Highlight search matches in code
    const getHighlightedCode = useCallback(() => {
        if (!searchQuery.trim() || matches.length === 0) {
            return code;
        }

        let result = '';
        let lastIndex = 0;

        matches.forEach((matchPos, idx) => {
            result += code.substring(lastIndex, matchPos);
            const matchText = code.substring(matchPos, matchPos + searchQuery.length);
            const isCurrentMatch = idx === currentMatch - 1;
            result += `<mark class="${isCurrentMatch ? 'bg-amber-400 text-slate-900' : 'bg-amber-200/50 text-amber-100'}">${matchText}</mark>`;
            lastIndex = matchPos + searchQuery.length;
        });

        result += code.substring(lastIndex);
        return result;
    }, [code, searchQuery, matches, currentMatch]);

    const lines = code.split('\n');

    return (
        <div
            ref={containerRef}
            className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 code-block-container"
            tabIndex={0}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">
                    {title || language.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setShowSearch(!showSearch);
                            if (!showSearch) {
                                setTimeout(() => searchInputRef.current?.focus(), 50);
                            }
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                        title="Search (Cmd+F / Ctrl+F)"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.shiftKey ? goToPrevMatch() : goToNextMatch();
                            }
                        }}
                        placeholder="Find in code..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    />
                    {matches.length > 0 && (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                            {currentMatch} of {matches.length}
                        </span>
                    )}
                    {searchQuery && matches.length === 0 && (
                        <span className="text-xs text-rose-400 whitespace-nowrap">
                            No matches
                        </span>
                    )}
                    <button
                        onClick={goToPrevMatch}
                        disabled={matches.length === 0}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNextMatch}
                        disabled={matches.length === 0}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            setShowSearch(false);
                            setSearchQuery('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Code */}
            <div
                className="overflow-auto"
                style={{ maxHeight: `${maxHeight}px` }}
            >
                <div className="flex">
                    {showLineNumbers && (
                        <div className="flex-shrink-0 py-4 pr-4 pl-4 text-right select-none border-r border-slate-700/50">
                            {lines.map((_, i) => (
                                <div
                                    key={i}
                                    className="text-xs leading-6 text-slate-500 font-mono"
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                    )}
                    <pre className="flex-1 py-4 px-4 overflow-x-auto m-0">
                        {searchQuery && matches.length > 0 ? (
                            <code
                                className={`language-${language} text-sm leading-6 font-mono code-syntax`}
                                dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
                            />
                        ) : (
                            <code
                                ref={codeRef}
                                className={`language-${language} text-sm leading-6 font-mono code-syntax`}
                            >
                                {code}
                            </code>
                        )}
                    </pre>
                </div>
            </div>

            {/* Custom Syntax Highlighting Styles */}
            <style>{`
                .code-syntax {
                    color: #e2e8f0; /* slate-200 - default text */
                }
                .code-syntax .token.comment,
                .code-syntax .token.prolog,
                .code-syntax .token.doctype,
                .code-syntax .token.cdata {
                    color: #6b7280; /* gray-500 */
                    font-style: italic;
                }
                .code-syntax .token.punctuation {
                    color: #94a3b8; /* slate-400 */
                }
                .code-syntax .token.property,
                .code-syntax .token.tag,
                .code-syntax .token.boolean,
                .code-syntax .token.number,
                .code-syntax .token.constant,
                .code-syntax .token.symbol,
                .code-syntax .token.deleted {
                    color: #f472b6; /* pink-400 */
                }
                .code-syntax .token.selector,
                .code-syntax .token.attr-name,
                .code-syntax .token.string,
                .code-syntax .token.char,
                .code-syntax .token.builtin,
                .code-syntax .token.inserted {
                    color: #a5f3fc; /* cyan-200 */
                }
                .code-syntax .token.operator,
                .code-syntax .token.entity,
                .code-syntax .token.url,
                .code-syntax .language-css .token.string,
                .code-syntax .style .token.string {
                    color: #fbbf24; /* amber-400 */
                }
                .code-syntax .token.atrule,
                .code-syntax .token.attr-value,
                .code-syntax .token.keyword {
                    color: #818cf8; /* indigo-400 */
                }
                .code-syntax .token.function,
                .code-syntax .token.class-name {
                    color: #34d399; /* emerald-400 */
                }
                .code-syntax .token.regex,
                .code-syntax .token.important,
                .code-syntax .token.variable {
                    color: #fb923c; /* orange-400 */
                }
                .code-syntax .token.important,
                .code-syntax .token.bold {
                    font-weight: bold;
                }
                .code-syntax .token.italic {
                    font-style: italic;
                }
                .code-syntax .token.entity {
                    cursor: help;
                }
                /* SQL/PLSQL specific */
                .code-syntax .token.sql-keyword {
                    color: #818cf8; /* indigo-400 */
                    font-weight: 600;
                }
                .code-block-container:focus {
                    outline: 2px solid #6366f1;
                    outline-offset: -2px;
                }
                .code-block-container mark {
                    border-radius: 2px;
                    padding: 0 2px;
                }
            `}</style>
        </div>
    );
}
