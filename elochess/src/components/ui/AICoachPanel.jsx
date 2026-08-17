import { useState, useRef, useEffect } from 'react'
import { aiCoach } from '../../core/AICoach'
import { useAppStore } from '../../store/useAppStore'

const QUICK_PROMPTS = [
  '💡 Explain position',
  '📖 Opening ideas',
  '⚡ Key tactics',
]

export default function AICoachPanel({ open, onClose, onOpen }) {
  const [messages, setMessages]   = useState([
    { role: 'assistant', content: "Hi! I'm your AI chess coach. Ask me anything about openings, tactics, or plans. What would you like to know?" }
  ])
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const msgsRef                   = useRef(null)
  const inputRef                  = useRef(null)
  const progress                  = useAppStore(s => s.progress)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
      aiCoach.setContext({ elo: progress.currentElo })
    }
  }, [open, progress.currentElo])

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [messages, thinking])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || thinking) return
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setThinking(true)

    try {
      const reply = await aiCoach.send(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ AI coach temporarily unavailable. Please try again.'
      }])
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Panel */}
      <div className={`
        fixed bottom-4 right-4 z-50 w-80 sm:w-96 flex flex-col
        bg-bg2 border border-border rounded-2xl shadow-card
        transition-all duration-300 origin-bottom-right
        ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
      `} style={{ maxHeight: '520px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <span className="text-gold font-bold text-sm">♞</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">AI Chess Coach</div>
            <div className="text-muted text-xs">Free · Chess questions only</div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { setMessages([{ role: 'assistant', content: 'Chat cleared! What would you like to know?' }]); aiCoach.clearHistory() }}
              className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-bg3 transition-colors"
              title="Clear chat"
            >
              ↺
            </button>
            <button
              onClick={onClose}
              className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-bg3 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={msgsRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-gold text-xs">♞</span>
                </div>
              )}
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold text-bg font-medium rounded-br-sm'
                  : 'bg-bg3 text-text rounded-bl-sm'
              }`}>
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <span className="text-gold text-xs">♞</span>
              </div>
              <div className="bg-bg3 px-3 py-2 rounded-xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                         style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => send(p.replace(/^.+? /, ''))}
              className="text-xs text-muted border border-border rounded-full px-2.5 py-1 hover:border-gold hover:text-gold transition-colors whitespace-nowrap shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 shrink-0">
          <div className="flex gap-2 bg-bg3 border border-border rounded-xl px-3 py-2 focus-within:border-gold/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about chess…"
              rows={1}
              disabled={thinking}
              className="flex-1 bg-transparent text-sm text-white placeholder-muted resize-none outline-none leading-relaxed max-h-24"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              aria-label="Send message"
              className="self-end text-bg bg-gold rounded-lg p-1.5 disabled:opacity-40 hover:bg-gold2 transition-colors active:scale-95"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* FAB when closed */}
      {!open && (
        <button
          onClick={onOpen}
          className="fixed bottom-4 right-4 z-40 w-14 h-14 bg-gold rounded-full shadow-card flex items-center justify-center text-bg text-2xl hover:bg-gold2 transition-colors active:scale-95"
        >
          ♞
        </button>
      )}
    </>
  )
}

/** Renders bold markdown **text** */
function MessageContent({ content }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
      )}
    </span>
  )
}
