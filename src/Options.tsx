import { useState, useCallback } from 'react';
import { LinkGroup, LinkItem } from './types';
import { useChromeStorage } from './hooks/useChromeStorage';
import { getLinkGroups, setLinkGroups } from './services/storage';
import './styles/tokens.css';

export default function Options() {
  const [groups, setGroups, loading] = useChromeStorage<LinkGroup[]>(
    'linkGroups',
    getLinkGroups,
    setLinkGroups,
    [],
  );
  const [newGroupName, setNewGroupName] = useState('');

  const addGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const group: LinkGroup = {
      id: crypto.randomUUID(),
      name,
      order: groups.length,
      links: [],
    };
    await setGroups((prev) => [...prev, group]);
    setNewGroupName('');
  }, [newGroupName, groups.length, setGroups]);

  const deleteGroup = useCallback(
    async (groupId: string) => {
      await setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [setGroups],
  );

  const addLink = useCallback(
    async (groupId: string, name: string, url: string) => {
      const link: LinkItem = {
        id: crypto.randomUUID(),
        name,
        url: url.startsWith('http') ? url : `https://${url}`,
        favicon: '',
      };
      await setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, links: [...g.links, link] } : g,
        ),
      );
    },
    [setGroups],
  );

  const deleteLink = useCallback(
    async (groupId: string, linkId: string) => {
      await setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, links: g.links.filter((l) => l.id !== linkId) }
            : g,
        ),
      );
    },
    [setGroups],
  );

  if (loading) return <div style={pageStyle}>Loading...</div>;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Descle Settings</h1>
      <h2 style={subtitleStyle}>Quick Links</h2>

      {groups
        .sort((a, b) => a.order - b.order)
        .map((group) => (
          <GroupEditor
            key={group.id}
            group={group}
            onAddLink={addLink}
            onDeleteLink={deleteLink}
            onDeleteGroup={deleteGroup}
          />
        ))}

      <div style={addGroupRowStyle}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="New group name..."
          style={inputStyle}
        />
        <button onClick={addGroup} style={btnStyle}>Add Group</button>
      </div>
    </div>
  );
}

function GroupEditor({
  group,
  onAddLink,
  onDeleteLink,
  onDeleteGroup,
}: {
  group: LinkGroup;
  onAddLink: (groupId: string, name: string, url: string) => Promise<void>;
  onDeleteLink: (groupId: string, linkId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) return;
    await onAddLink(group.id, name.trim(), url.trim());
    setName('');
    setUrl('');
  };

  return (
    <div style={groupCardStyle}>
      <div style={groupHeaderStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{group.name}</h3>
        <button
          onClick={() => onDeleteGroup(group.id)}
          style={deleteBtnStyle}
        >
          Delete group
        </button>
      </div>

      {group.links.map((link) => (
        <div key={link.id} style={linkRowStyle}>
          <span style={{ flex: 1 }}>{link.name}</span>
          <span style={{ color: '#999', fontSize: 12, flex: 2 }}>{link.url}</span>
          <button
            onClick={() => onDeleteLink(group.id, link.id)}
            style={{ ...deleteBtnStyle, fontSize: 12 }}
          >
            Remove
          </button>
        </div>
      ))}

      <div style={addLinkRowStyle}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Link name"
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="URL"
          style={{ ...inputStyle, flex: 2 }}
        />
        <button onClick={handleAdd} style={btnStyle}>Add</button>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 700,
  margin: '40px auto',
  padding: '0 24px',
  fontFamily: 'var(--font-body)',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-headline)',
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 8,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  marginBottom: 16,
};

const groupCardStyle: React.CSSProperties = {
  border: '1px solid #e2e5e9',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  background: '#fff',
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};

const linkRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  borderBottom: '1px solid #f5f5f5',
  fontSize: 14,
};

const addLinkRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
};

const addGroupRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e2e5e9',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#5200E1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#DC2626',
  fontSize: 13,
  cursor: 'pointer',
};
