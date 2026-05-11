import { useState, useEffect, useCallback, useMemo } from 'react';
import { LinkGroup } from '../types';

/* ── helpers ─────────────────────────────────────────── */

function getFaviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return '';
  }
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/* ── bookmark tree → LinkGroup[] ─────────────────────── */

const hasBookmarksApi =
  typeof chrome !== 'undefined' && !!chrome.bookmarks;

function flattenFolder(
  node: chrome.bookmarks.BookmarkTreeNode,
): LinkGroup | null {
  const links = (node.children ?? [])
    .filter((c) => c.url)
    .map((c) => ({
      id: c.id,
      name: c.title || c.url!,
      url: c.url!,
      favicon: '',
    }));
  if (links.length === 0) return null;
  return {
    id: `bm-${node.id}`,
    name: node.title || 'Bookmarks',
    order: 0,
    links,
  };
}

interface BookmarkFolder {
  id: string;
  title: string;
}

function collectFolders(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  result: BookmarkFolder[] = [],
): BookmarkFolder[] {
  for (const node of nodes) {
    if (node.children) {
      if (node.title) result.push({ id: node.id, title: node.title });
      collectFolders(node.children, result);
    }
  }
  return result;
}

function treeToGroups(
  roots: chrome.bookmarks.BookmarkTreeNode[],
): LinkGroup[] {
  const groups: LinkGroup[] = [];
  const topChildren = roots[0]?.children ?? [];
  for (const node of topChildren) {
    if (node.children) {
      const g = flattenFolder(node);
      if (g) groups.push(g);
      for (const sub of node.children) {
        if (sub.children) {
          const sg = flattenFolder(sub);
          if (sg) groups.push(sg);
        }
      }
    }
  }
  for (const node of topChildren) {
    if (node.url) {
      let misc = groups.find((g) => g.id === 'bm-misc');
      if (!misc) {
        misc = { id: 'bm-misc', name: 'Bookmarks', order: 0, links: [] };
        groups.push(misc);
      }
      misc.links.push({
        id: node.id,
        name: node.title || node.url,
        url: node.url,
        favicon: '',
      });
    }
  }
  return groups.map((g, i) => ({ ...g, order: i }));
}

function useBookmarks(): [LinkGroup[], BookmarkFolder[], boolean] {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!hasBookmarksApi) {
      setLoading(false);
      return;
    }
    chrome.bookmarks.getTree((tree) => {
      setGroups(treeToGroups(tree));
      setFolders(collectFolders(tree));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    if (!hasBookmarksApi) return;
    const onChange = () => load();
    chrome.bookmarks.onCreated.addListener(onChange);
    chrome.bookmarks.onRemoved.addListener(onChange);
    chrome.bookmarks.onChanged.addListener(onChange);
    chrome.bookmarks.onMoved.addListener(onChange);
    return () => {
      chrome.bookmarks.onCreated.removeListener(onChange);
      chrome.bookmarks.onRemoved.removeListener(onChange);
      chrome.bookmarks.onChanged.removeListener(onChange);
      chrome.bookmarks.onMoved.removeListener(onChange);
    };
  }, [load]);

  return [groups, folders, loading];
}

/* ── component ───────────────────────────────────────── */

export default function QuickLinks() {
  const [groups, folders, loading] = useBookmarks();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newFolderId, setNewFolderId] = useState('');

  const totalLinks = groups.reduce((sum, g) => sum + g.links.length, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        links: g.links.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.url.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.links.length > 0);
  }, [groups, query]);

  const filteredCount = filtered.reduce((sum, g) => sum + g.links.length, 0);

  const openAddForm = () => {
    setAdding(true);
    setNewTitle('');
    setNewUrl('');
    setNewFolderId(folders[0]?.id ?? '');
  };

  const handleAdd = () => {
    const url = newUrl.trim();
    const title = newTitle.trim();
    if (!url || !hasBookmarksApi) return;

    const finalUrl = /^https?:\/\//.test(url) ? url : `https://${url}`;
    chrome.bookmarks.create({
      parentId: newFolderId || undefined,
      title: title || finalUrl,
      url: finalUrl,
    });
    setAdding(false);
  };

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Bookmarks</span>
        <span className="section-badge">
          {totalLinks} link{totalLinks !== 1 ? 's' : ''}
        </span>
      </div>

      {!loading && totalLinks > 0 && (
        <div className="search-wrap">
          <svg
            className="search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks..."
          />
          {query && (
            <span
              className="search-clear"
              onClick={() => setQuery('')}
            >
              &times;
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Loading...
        </p>
      ) : totalLinks === 0 ? (
        <p style={emptyStyle}>No bookmarks found.</p>
      ) : filteredCount === 0 ? (
        <p style={emptyStyle}>No results for &ldquo;{query}&rdquo;</p>
      ) : (
        filtered.map((group) => (
          <div key={group.id} style={groupStyle}>
            <div style={groupTitleStyle}>{group.name}</div>
            <div style={linkListStyle}>
              {group.links.map((link) => (
                <div key={link.id} style={linkWrapStyle} className="bm-link-wrap">
                  <a
                    href={link.url}
                    className="bm-link"
                    title={link.url}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div style={faviconStyle}>
                      {getFaviconUrl(link.url) ? (
                        <img
                          src={getFaviconUrl(link.url)}
                          alt=""
                          width={16}
                          height={16}
                          style={{ borderRadius: 2 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                          }}
                        />
                      ) : null}
                      <span
                        style={{
                          display: getFaviconUrl(link.url) ? 'none' : 'inline',
                        }}
                      >
                        {getInitial(link.name)}
                      </span>
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.name}
                    </span>
                  </a>
                  <span
                    className="bm-delete"
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasBookmarksApi) chrome.bookmarks.remove(link.id);
                    }}
                  >
                    &times;
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {!loading && (
        adding ? (
          <div className="add-form">
            <div className="form-field">
              <label className="form-label">Name</label>
              <div className="form-input-wrap">
                <span className="form-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="14" y2="15" />
                  </svg>
                </span>
                <input
                  className="form-input"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark name"
                  autoFocus
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">URL</label>
              <div className="form-input-wrap">
                <span className="form-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <input
                  className="form-input"
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Folder</label>
              <div className="form-input-wrap">
                <span className="form-input-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <select
                  className="form-select"
                  value={newFolderId}
                  onChange={(e) => setNewFolderId(e.target.value)}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
                <span className="form-select-chevron">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleAdd}
                disabled={!newUrl.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button className="bm-add-btn" onClick={openAddForm}>
            + Add bookmark
          </button>
        )
      )}
    </div>
  );
}

/* ── styles ──────────────────────────────────────────── */

const groupStyle: React.CSSProperties = {
  marginBottom: 16,
  borderRadius: 'var(--radius-small)',
  padding: 8,
};

const groupTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.4,
  marginBottom: 8,
};

const linkListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const linkWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const faviconStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  background: 'var(--color-favicon-bg)',
  borderRadius: 3,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  color: 'var(--color-favicon-text)',
  overflow: 'hidden',
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 14,
  padding: '24px 0',
  textAlign: 'center',
};


