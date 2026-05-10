import { useState } from 'react'

const tabs = [
  { key: 'html', label: 'HTML' },
  { key: 'css', label: 'CSS' },
  { key: 'js', label: 'JavaScript' },
]

export default function CodePreview({ code, slug, onSaved }) {
  const [active, setActive] = useState('html')
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  if (!code) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-2">代码预览</h3>
        <p className="text-gray-600 text-sm">代码尚未生成</p>
      </div>
    )
  }

  const current = editing[active] ?? code[active] ?? ''

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const updated = { ...code, ...editing }
      const res = await fetch(`/api/episodes/${slug}/code`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('保存失败')
      setMsg('已保存')
      if (onSaved) onSaved(updated)
    } catch (err) {
      setMsg(`错误：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                active === t.key
                  ? 'bg-tech-500/20 text-tech-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-xs ${msg.startsWith('错误') ? 'text-red-400' : 'text-green-400'}`}>{msg}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-tech-600 hover:bg-tech-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      <textarea
        className="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-300 resize-y focus:outline-none focus:border-tech-500"
        value={current}
        onChange={(e) => setEditing({ ...editing, [active]: e.target.value })}
        spellCheck={false}
      />
    </div>
  )
}
