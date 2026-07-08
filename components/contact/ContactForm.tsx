'use client';

import { useState } from 'react';

// Customer-service contact form — email + message (distinct from the marketing
// newsletter). Posts to the rate-limited, server-validated /api/contact; the
// owner reads/answers submissions in /portal/mensajes.
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus('done');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not send your message. Please try again.');
        setStatus('error');
      }
    } catch {
      setError('Could not send your message. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="contact__done">
        <p className="contact__done-title">Thank you.</p>
        <p className="contact__done-sub">
          Your message is with us. We answer every note personally — expect to hear back soon.
        </p>
      </div>
    );
  }

  return (
    <form className="contact__form" onSubmit={submit}>
      <label className="contact__field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          placeholder="Your name (optional)"
        />
      </label>
      <label className="contact__field">
        <span>Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          autoComplete="email"
          placeholder="you@email.com"
        />
      </label>
      <label className="contact__field">
        <span>Message</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          rows={6}
          placeholder="How can we help?"
        />
      </label>
      {status === 'error' && <p className="contact__error">{error}</p>}
      <button type="submit" className="btn-fill" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
