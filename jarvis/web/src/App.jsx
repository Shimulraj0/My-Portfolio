import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiChevronDown, FiSend, FiUser, FiBriefcase, FiCode, FiMail, FiGithub, FiLinkedin, FiInstagram } from 'react-icons/fi';
import 'reactflow/dist/style.css';
import './index.css';
import { api } from './api.js';

function layout(flow) {
  const indeg = {};
  const adj = {};
  flow.nodes.forEach((n) => { indeg[n.id] = 0; adj[n.id] = []; });
  flow.nodes.forEach((n) => {
    const conn = flow.connections[n.id] || {};
    const tgts = conn.out || [...(conn.true || []), ...(conn.false || [])];
    tgts.forEach((t) => { adj[n.id].push(t); indeg[t] = (indeg[t] || 0) + 1; });
  });
  const level = {};
  const queue = [];
  flow.nodes.forEach((n) => { if (indeg[n.id] === 0) { level[n.id] = 0; queue.push(n.id); } });
  while (queue.length) {
    const id = queue.shift();
    adj[id].forEach((t) => { if (--indeg[t] === 0) { level[t] = level[id] + 1; queue.push(t); } });
  }
  const byLevel = {};
  flow.nodes.forEach((n) => { (byLevel[level[n.id]] = byLevel[level[n.id]] || []).push(n.id); });
  const nodes = flow.nodes.map((n) => {
    const col = byLevel[level[n.id]] || [n.id];
    const idx = col.indexOf(n.id);
    return { id: n.id, type: 'jarvis', position: { x: (level[n.id] || 0) * 280, y: idx * 130 }, data: { label: n.id, type: n.type, status: 'idle' } };
  });
  const edges = [];
  flow.nodes.forEach((n) => {
    const conn = flow.connections[n.id] || {};
    if (conn.out) { conn.out.forEach((t) => edges.push({ id: n.id + '-' + t, source: n.id, target: t, animated: false })); }
    else { (conn.true || []).forEach((t) => edges.push({ id: n.id + '-' + t, source: n.id, target: t, label: 'T', animated: false })); (conn.false || []).forEach((t) => edges.push({ id: n.id + '-' + t, source: n.id, target: t, label: 'F', animated: false })); }
  });
  return { nodes, edges };
}

function JarvisNode({ data }) {
  return (
    <div className={'jarvis-node node-' + data.status}>
      <Handle type="target" position={Position.Top} />
      <div className="node-label">{data.label}</div>
      <div className="node-type">{data.type}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { jarvis: JarvisNode };

const skills = [
  { name: 'Flutter', level: 90 },
  { name: 'Dart', level: 88 },
  { name: 'Firebase', level: 82 },
  { name: 'React', level: 75 },
  { name: 'Node.js', level: 70 },
  { name: 'Python', level: 72 },
  { name: 'Provider', level: 85 },
  { name: 'GetX', level: 80 },
  { name: 'Riverpod', level: 78 },
  { name: 'Material Design', level: 88 },
  { name: 'REST APIs', level: 82 },
  { name: 'AI/LLMs', level: 65 },
];

const projects = [
  { name: 'Find Med', desc: 'Healthcare discovery app with AI-powered recommendations', icon: '🏥' },
  { name: 'TaskEase', desc: 'Productivity task manager with smart scheduling', icon: '✅' },
  { name: 'Gran Guide', desc: 'Local guide and recommendation platform', icon: '🗺️' },
  { name: 'Wonderland', desc: 'Immersive storytelling and exploration app', icon: '✨' },
  { name: 'Peptide AI', desc: 'AI-driven peptide analysis and visualization', icon: '🧬' },
  { name: 'Football AI', desc: 'Sports analytics and prediction engine', icon: '⚽' },
  { name: 'Auto Intel', desc: 'Automated intelligence and data processing pipeline', icon: '🤖' },
  { name: 'Bluetooth Media Player', desc: 'Wireless media control and streaming app', icon: '🎵' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'About', href: '#about' },
    { label: 'Skills', href: '#skills' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
    { label: 'Jarvis', href: '#jarvis' },
  ];

  return (
    <motion.nav
      className={'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ' + (scrolled ? 'bg-[#0b0f17]/90 backdrop-blur-md border-b border-[#1e2a3a]' : 'bg-transparent')}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#hero" className="text-xl font-bold tracking-widest text-[#4fc3f7]">J.A.R.V.I.S</a>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link text-sm font-medium">{l.label}</a>
          ))}
        </div>
        <button className="md:hidden text-[#d7e2f0]" onClick={() => setOpen(!open)}>
          {open ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden bg-[#111826] border-b border-[#1e2a3a]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-[#d7e2f0] hover:text-[#4fc3f7] transition-colors" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center hero-gradient">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <p className="text-[#4fc3f7] font-mono text-sm tracking-widest mb-4">FLUTTER DEVELOPER & AI EXPLORER</p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Shimul Raj <span className="gradient-text">Das</span>
          </h1>
          <p className="text-[#7c8aa0] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Building beautiful cross-platform apps with Flutter, exploring AI & LLMs,
            and tinkering with technology from Dhaka, Bangladesh.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#projects" className="cta-btn cta-primary">View Projects</a>
            <a href="#contact" className="cta-btn cta-secondary">Get In Touch</a>
          </div>
        </motion.div>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <FiChevronDown className="text-[#4fc3f7] animate-bounce" size={32} />
        </motion.div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">About <span className="gradient-text">Me</span></h2>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#d7e2f0] leading-relaxed mb-6">
              I am a Flutter Developer based in Dhaka, Bangladesh, with a Diploma in Engineering (CST)
              from Shariatpur Polytechnic Institute. I work with cross-platform frameworks, state management,
              and modern UI design patterns.
            </p>
            <p className="text-[#7c8aa0] leading-relaxed mb-6">
              Currently working as a Junior Flutter Developer at Sparktech Agency (Under Betopia Ltd).
              I am passionate about building beautiful, performant applications and exploring the intersection
              of AI and mobile development.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:shimulrajdas001@gmail.com" className="cta-btn cta-primary">
                <FiMail size={18} /> Contact Me
              </a>
              <a href="https://drive.google.com/file/d/1LctFc_qvs4Vzz2jEEPzfecsT8FcMVdYT/view?usp=sharing" target="_blank" rel="noopener" className="cta-btn cta-secondary">
                <FiUser size={18} /> Resume
              </a>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Location', value: 'Dhaka, Bangladesh' },
              { label: 'Email', value: 'shimulrajdas001@gmail.com' },
              { label: 'Education', value: 'Diploma in Engineering (CST)' },
              { label: 'Experience', value: 'Junior Flutter Developer at Sparktech Agency' },
              { label: 'Open To', value: 'Flutter work, AI experiments, tech collaborations' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-3 border-b border-[#1e2a3a]">
                <span className="text-[#7c8aa0]">{item.label}</span>
                <span className="text-[#d7e2f0] text-right max-w-[60%]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">My <span className="gradient-text">Skills</span></h2>
        <p className="section-subtitle mb-10">Technologies and tools I work with on a daily basis.</p>
        <div className="flex flex-wrap gap-3">
          {skills.map((skill) => (
            <motion.span
              key={skill.name}
              className="skill-tag"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              {skill.name}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function Projects() {
  return (
    <section id="projects" className="section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Featured <span className="gradient-text">Projects</span></h2>
        <p className="section-subtitle mb-10">A selection of apps and tools I have built.</p>
        <div className="project-grid">
          {projects.map((project, i) => (
            <motion.div
              key={project.name}
              className="portfolio-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
            >
              <div className="text-3xl mb-4">{project.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-[#d7e2f0]">{project.name}</h3>
              <p className="text-[#7c8aa0] text-sm leading-relaxed">{project.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Get In <span className="gradient-text">Touch</span></h2>
        <p className="section-subtitle mb-10">Have a project in mind? Let us talk.</p>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111826] border border-[#1e2a3a] flex items-center justify-center">
                <FiMail className="text-[#4fc3f7]" size={18} />
              </div>
              <div>
                <p className="text-[#7c8aa0] text-sm">Email</p>
                <a href="mailto:shimulrajdas001@gmail.com" className="text-[#d7e2f0] hover:text-[#4fc3f7] transition-colors">shimulrajdas001@gmail.com</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111826] border border-[#1e2a3a] flex items-center justify-center">
                <FiGithub className="text-[#4fc3f7]" size={18} />
              </div>
              <div>
                <p className="text-[#7c8aa0] text-sm">GitHub</p>
                <a href="https://github.com/Shimulraj0" target="_blank" rel="noopener" className="text-[#d7e2f0] hover:text-[#4fc3f7] transition-colors">github.com/Shimulraj0</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111826] border border-[#1e2a3a] flex items-center justify-center">
                <FiLinkedin className="text-[#4fc3f7]" size={18} />
              </div>
              <div>
                <p className="text-[#7c8aa0] text-sm">LinkedIn</p>
                <a href="https://www.linkedin.com/in/shimulrajdas001/" target="_blank" rel="noopener" className="text-[#d7e2f0] hover:text-[#4fc3f7] transition-colors">linkedin.com/in/shimulrajdas001</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#111826] border border-[#1e2a3a] flex items-center justify-center">
                <FiInstagram className="text-[#4fc3f7]" size={18} />
              </div>
              <div>
                <p className="text-[#7c8aa0] text-sm">Instagram</p>
                <a href="https://www.instagram.com/0_shimul.raj_0/" target="_blank" rel="noopener" className="text-[#d7e2f0] hover:text-[#4fc3f7] transition-colors">@0_shimul.raj_0</a>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <a href="https://github.com/Shimulraj0" target="_blank" rel="noopener" className="social-link"><FiGithub size={20} /></a>
              <a href="https://www.linkedin.com/in/shimulrajdas001/" target="_blank" rel="noopener" className="social-link"><FiLinkedin size={20} /></a>
              <a href="https://www.instagram.com/0_shimul.raj_0/" target="_blank" rel="noopener" className="social-link"><FiInstagram size={20} /></a>
            </div>
          </div>
          <div className="weavely-embed">
            <iframe
              src="https://weavely.ai/embed/contact"
              title="Contact Form"
              className="w-full h-[400px] border-0"
              loading="lazy"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function JarvisChat() {
  const [flows, setFlows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState({});
  const [log, setLog] = useState([]);
  const [message, setMessage] = useState('');
  const logRef = useRef(null);

  const pushLog = (line) => setLog((prev) => [...prev.slice(-199), line]);

  useEffect(() => {
    api.getFlows().then((list) => { setFlows(list); if (list.length) setSelected(list[0]); });
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const ws = api.openEventsStream((event) => {
      const { type, nodeId } = event;
      if (type === 'node.pending') setStatus((s) => ({ ...s, [nodeId]: 'pending' }));
      else if (type === 'node.running') setStatus((s) => ({ ...s, [nodeId]: 'running' }));
      else if (type === 'node.completed') setStatus((s) => ({ ...s, [nodeId]: 'completed' }));
      else if (type === 'node.error') setStatus((s) => ({ ...s, [nodeId]: 'error' }));
      else if (type === 'agent.running') pushLog('agent ' + event.agent + ' running');
      else if (type === 'agent.step') pushLog('  ' + event.message);
      else if (type === 'memory.stored') pushLog('memory: ' + event.content);
    });
    return () => ws.close();
  }, [selected]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  const { nodes, edges } = useMemo(() => {
    if (!selected) return { nodes: [], edges: [] };
    const { nodes: ns, edges: es } = layout(selected);
    return {
      nodes: ns.map((n) => ({ ...n, data: { ...n.data, status: status[n.id] || 'idle' } })),
      edges: es.map((e) => ({ ...e, animated: ['running', 'completed', 'pending'].includes(status[e.source] || '') })),
    };
  }, [selected, status]);

  const run = async () => {
    if (!selected) return;
    setLog([]);
    try {
      const result = await api.runFlow(selected.id);
      pushLog('run ' + result.executionId + ' complete: ' + JSON.stringify(result.outputs));
    } catch (err) { pushLog('run failed: ' + err.message); }
  };

  const send = async () => {
    const text = message.trim();
    if (!text) return;
    setMessage('');
    pushLog('> ' + text);
    try {
      await api.chat(text, (event) => {
        if (event.type === 'step') pushLog('step: ' + Object.keys(event.update || {}).join(', '));
        else if (event.type === 'done') pushLog('Jarvis: ' + event.reply);
      });
    } catch (err) { pushLog('chat failed: ' + err.message); }
  };

  return (
    <section id="jarvis" className="section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">J.A.R.V.I.S <span className="gradient-text">Chat</span></h2>
        <p className="section-subtitle mb-10">Interact with the AI assistant. Run flows and chat in real-time.</p>
        <div className="chat-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2a3a]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#2ecc71] pulse-live" />
              <span className="text-sm font-medium text-[#d7e2f0]">J.A.R.V.I.S</span>
            </div>
            <div className="flex gap-2">
              <button className="cta-btn cta-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={run}>Run Flow</button>
            </div>
          </div>
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 relative">
              {selected ? (
                <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView style={{ background: 'transparent' }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[#7c8aa0]">No flows available</div>
              )}
            </div>
            <div className="w-80 flex flex-col border-l border-[#1e2a3a]">
              <div className="flex-1 overflow-hidden">
                <div className="log" ref={logRef}>
                  {log.length === 0 && <div className="hint">Execution events and replies appear here.</div>}
                  {log.map((line, i) => (
                    <div key={i} className="log-line">{line}</div>
                  ))}
                </div>
              </div>
              <div className="chat-input">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Talk to Jarvis..."
                />
                <button onClick={send}><FiSend size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>Built with React, Flutter, and a lot of curiosity. &copy; {new Date().getFullYear()} Shimul Raj Das.</p>
    </footer>
  );
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
        <JarvisChat />
      </main>
      <Footer />
    </div>
  );
}