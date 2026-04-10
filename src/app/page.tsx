"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Sparkles, User, Bot, Trash2, MessageSquare, Pencil, Check, X, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Settings State
  const [settings, setSettings] = useState({ model: "gemini", length: "media", textStyle: "normal" });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState("");

  // Load chats from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem("ai-dashboard-chats");
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        console.error("Error loading chats", e);
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save chats to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("ai-dashboard-chats", JSON.stringify(chats));
    }
  }, [chats]);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("ai-dashboard-settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
    const savedMemories = localStorage.getItem("ai-dashboard-memories");
    if (savedMemories) {
      try {
        setMemories(JSON.parse(savedMemories));
      } catch (e) {
        console.error("Error loading memories", e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("ai-dashboard-settings", JSON.stringify(settings));
  }, [settings]);

  // Save memories to localStorage
  useEffect(() => {
    localStorage.setItem("ai-dashboard-memories", JSON.stringify(memories));
  }, [memories]);

  // Focus the edit input when starting to edit
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "Nova Conversa",
      messages: [],
      updatedAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter((c) => c.id !== id);
    setChats(newChats);
    if (activeChatId === id) {
      setActiveChatId(newChats.length > 0 ? newChats[0].id : null);
    }
    if (newChats.length === 0) {
      createNewChat();
    }
  };

  const startRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = () => {
    if (!editingChatId) return;
    const finalTitle = editingTitle.trim() || "Sem título";
    setChats((prev) =>
      prev.map((c) => (c.id === editingChatId ? { ...c, title: finalTitle } : c))
    );
    setEditingChatId(null);
  };

  const cancelRename = () => {
    setEditingChatId(null);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeChatId) return;

    const userMessage = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { 
              ...c, 
              messages: newMessages, 
              updatedAt: Date.now(),
              title: c.messages.length === 0 ? userMessage.substring(0, 30) : c.title 
            }
          : c
      )
    );
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          config: settings,
          memories
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      // Add placeholder for AI response
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: [...newMessages, { role: "ai", content: "" }] }
            : c
        )
      );

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        aiResponse += chunk;

        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: [
                    ...newMessages,
                    { role: "ai", content: aiResponse },
                  ],
                }
              : c
          )
        );
      }
      
      // Async memory extraction
      fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...newMessages, { role: "ai", content: aiResponse }] }),
      })
      .then(r => r.json())
      .then(data => {
        if (data.memories && data.memories.length > 0) {
          setMemories(prev => {
            const newMems = data.memories.filter((m: string) => !prev.includes(m));
            return [...prev, ...newMems];
          });
        }
      })
      .catch(e => console.error("Memory extraction error", e));

    } catch (error) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [
                  ...newMessages,
                  { role: "ai", content: "Ops, algo deu errado. Por favor, tente novamente." },
                ],
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [welcomeMessage, setWelcomeMessage] = useState("");
  const initialMessages = [
    "Como posso te ajudar?",
    "O que tem anotado pra hoje?",
    "Nexo pode te ajudar!",
    "Bom dia!"
  ];

  useEffect(() => {
    setWelcomeMessage(initialMessages[Math.floor(Math.random() * initialMessages.length)]);
  }, [activeChatId]);

  return (
    <main className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <button className="new-chat-btn" onClick={createNewChat}>
          <Plus size={16} />
          Novo Chat
        </button>
        
        <div className="chat-history">
          {chats.map((chat) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              key={chat.id} 
              className={`history-item ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => setActiveChatId(chat.id)}
            >
              <MessageSquare size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
              
              {editingChatId === chat.id ? (
                <input
                  ref={editInputRef}
                  className="edit-chat-input"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                />
              ) : (
                <span className="chat-title">{chat.title}</span>
              )}

              <div className="chat-item-actions">
                <button 
                  className="edit-chat-btn" 
                  onClick={(e) => startRename(e, chat)}
                  title="Renomear chat"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  className="delete-chat-btn" 
                  onClick={(e) => deleteChat(e, chat.id)}
                  title="Excluir chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '10px', fontSize: '12px', color: '#666', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={12} color="var(--accent-light)" />
            <span>Nexo 3 Flash</span>
          </div>
          <button 
            className="settings-toggle-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="main-chat">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles size={64} className="accent-glow sparkle-pulse" style={{ marginBottom: '20px' }} />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={welcomeMessage}
                style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.02em', textAlign: 'center' }}
              >
                {welcomeMessage}
              </motion.h1>
            </div>
          ) : (
            <div className="messages-list">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`message-row ${m.role}`}
                  >
                    <div className="message-content">
                      <div className={`avatar ${m.role}`}>
                        {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
                      </div>
                      <div className={`text markdown-container font-style-${settings.textStyle || 'normal'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content || (isLoading && i === messages.length - 1 ? "..." : "")}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container glass">
            <textarea
              ref={textareaRef}
              placeholder="Envie uma mensagem..."
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              className="send-btn" 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="input-footer">
            Nexo pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </section>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="settings-modal glass"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={20} className="accent-glow" />
                  <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Configurações</h2>
                </div>
                <button className="close-modal-btn" onClick={() => setIsSettingsOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="setting-section">
                  <h3 className="section-title">Modelo de Inteligência</h3>
                  <p className="section-desc">Escolha qual cérebro alimentará o NexoIA.</p>
                  <div className="option-grid">
                    <button 
                      className={`option-card ${settings.model === "gemini" ? "active" : ""}`}
                      onClick={() => setSettings(prev => ({ ...prev, model: "gemini" }))}
                    >
                      <div className="card-radio"></div>
                      <div className="card-info">
                        <span className="card-title">Gemini 3 Flash</span>
                        <span className="card-tag">Padrão Google</span>
                      </div>
                    </button>
                    <button 
                      className={`option-card ${settings.model === "chatgpt" ? "active" : ""}`}
                      onClick={() => setSettings(prev => ({ ...prev, model: "chatgpt" }))}
                    >
                      <div className="card-radio"></div>
                      <div className="card-info">
                        <span className="card-title">Chat GPT</span>
                        <span className="card-tag">OpenRouter / gpt-oss</span>
                      </div>
                    </button>
                    <button 
                      className={`option-card ${settings.model === "groq" ? "active" : ""}`}
                      onClick={() => setSettings(prev => ({ ...prev, model: "groq" }))}
                    >
                      <div className="card-radio"></div>
                      <div className="card-info">
                        <span className="card-title">Groq</span>
                        <span className="card-tag">Llama 3.3 70B</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="setting-section">
                  <h3 className="section-title">Tamanho das Respostas</h3>
                  <p className="section-desc">Controle o nível de detalhamento das conversas.</p>
                  <div className="length-list">
                    {[
                      { id: "extremamente-curta", label: "Extremamente Curta", desc: "Máximo 3 linhas" },
                      { id: "curta", label: "Curta", desc: "Máximo 10 linhas" },
                      { id: "media", label: "Média", desc: "Até 30 linhas" },
                      { id: "grande", label: "Grande", desc: "Até 70 linhas" },
                      { id: "enorme", label: "Enorme", desc: "Papo longo (150 linhas)" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        className={`length-item ${settings.length === opt.id ? "active" : ""}`}
                        onClick={() => setSettings(prev => ({ ...prev, length: opt.id }))}
                      >
                        <span className="l-label">{opt.label}</span>
                        <span className="l-dot"></span>
                        <span className="l-desc">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-section">
                  <h3 className="section-title">Estilo da Fonte</h3>
                  <p className="section-desc">Personalize como as respostas do Nexo aparecem na tela.</p>
                  <div className="option-grid">
                    {[
                      { id: "normal", label: "Normal" },
                      { id: "bold", label: "Negrito" },
                      { id: "italic", label: "Cursivo" },
                      { id: "uppercase", label: "Maiúsculas" },
                      { id: "lowercase", label: "Minúsculas" }
                    ].map(style => (
                      <button 
                        key={style.id}
                        className={`option-card ${settings.textStyle === style.id || (!settings.textStyle && style.id === 'normal') ? "active" : ""}`}
                        onClick={() => setSettings(prev => ({ ...prev, textStyle: style.id }))}
                        style={{ padding: '10px' }}
                      >
                        <div className="card-radio"></div>
                        <div className="card-info">
                          <span className="card-title">{style.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-section">
                  <h3 className="section-title">Lembranças do Nexo</h3>
                  <p className="section-desc">Fatos que o Nexo aprendeu sobre você para personalizar as conversas.</p>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input 
                      type="text" 
                      placeholder="Adicionar lembrança manualmente..." 
                      className="edit-chat-input" 
                      style={{ padding: '8px 12px' }}
                      value={newMemoryInput}
                      onChange={(e) => setNewMemoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newMemoryInput.trim()) {
                          setMemories(prev => [...prev, newMemoryInput.trim()]);
                          setNewMemoryInput("");
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (newMemoryInput.trim()) {
                          setMemories(prev => [...prev, newMemoryInput.trim()]);
                          setNewMemoryInput("");
                        }
                      }}
                      className="send-btn"
                      style={{ padding: '8px' }}
                      disabled={!newMemoryInput.trim()}
                      title="Adicionar"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="memories-list">
                    {memories.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>O Nexo ainda não aprendeu fatos sobre você.</p>
                    ) : (
                      memories.map((m, idx) => (
                        <div key={idx} className="memory-item">
                          <span>{m}</span>
                          <button 
                            onClick={() => setMemories(prev => prev.filter((_, i) => i !== idx))} 
                            className="delete-memory-btn" 
                            title="Esquecer este fato"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
