'use client'
import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'

function useLivePrices (intervalMs = 10000) {
  const [prices, setPrices] = useState({
    btc: null,
    eth: null,
    fetchedAt: null,
    error: null
  })
  useEffect(() => {
    let mounted = true
    async function fetchPrices () {
      try {
        const res = await fetch(COINGECKO_URL)
        const json = await res.json()
        if (!mounted) return
        setPrices({
          btc: {
            usd: json.bitcoin?.usd ?? null,
            change24h: json.bitcoin?.usd_24h_change ?? null
          },
          eth: {
            usd: json.ethereum?.usd ?? null,
            change24h: json.ethereum?.usd_24h_change ?? null
          },
          fetchedAt: Date.now(),
          error: null
        })
      } catch (err) {
        if (!mounted) return
        setPrices(prev => ({ ...prev, error: err.message }))
      }
    }
    fetchPrices()
    const t = setInterval(fetchPrices, intervalMs)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [intervalMs])
  return prices
}

function useParticles (canvasRef, opts = {}) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = (canvas.width = canvas.clientWidth)
    let h = (canvas.height = canvas.clientHeight)
    const particles = []
    const count = Math.round((opts.count || 50) * (w / 1200))

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.1 - Math.random() * 0.5,
        alpha: 0.12 + Math.random() * 0.15
      })
    }

    let raf = null
    function draw () {
      ctx.clearRect(0, 0, w, h)
      // soft glow background overlay
      for (let p of particles) {
        ctx.beginPath()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = '#f0b90b' // accent color of particles
        ctx.shadowBlur = 10
        ctx.shadowColor = '#f0b90b33'
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      // lines between close particles
      ctx.strokeStyle = 'rgba(240,185,11,0.06)'
      ctx.lineWidth = 0.6
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.globalAlpha = 0.03 + ((110 - dist) / 110) * 0.06
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      update()
      raf = requestAnimationFrame(draw)
    }
    function update () {
      w = canvas.width = canvas.clientWidth
      h = canvas.height = canvas.clientHeight
      for (let p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
      }
    }
    draw()
    const onResize = () => {
      w = canvas.width = canvas.clientWidth
      h = canvas.height = canvas.clientHeight
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [canvasRef, opts.count])
}

export default function AdvancedCryptoHero () {
  // UI state
  const [menuOpen, setMenuOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState(null)
  const [network, setNetwork] = useState(null)
  const prices = useLivePrices(15000) // every 15s
  const canvasRef = useRef(null)
  useParticles(canvasRef, { count: 60 })

  // disable scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // MetaMask connect (simple)
  async function connectWallet () {
    try {
      if (!window.ethereum) {
        alert('MetaMask not found. Install MetaMask or use a Web3 wallet.')
        return
      }
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      setAccount(accounts[0])
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      setNetwork(chainId)
      setConnected(true)
      // basic listener
      window.ethereum.on &&
        window.ethereum.on('accountsChanged', accts => {
          setAccount(accts[0] || null)
          setConnected(!!accts.length)
        })
      window.ethereum.on &&
        window.ethereum.on('chainChanged', chain => setNetwork(chain))
    } catch (err) {
      console.error('Wallet connect error', err)
    }
  }

  function disconnectWallet () {
    // For MetaMask there's no programmatic disconnect — we simply clear state
    setConnected(false)
    setAccount(null)
    setNetwork(null)
  }

  // animated counters helper (simple)
  function AnimatedNumber ({
    value,
    decimals = 0,
    prefix = '',
    className = ''
  }) {
    const [display, setDisplay] = useState(0)
    useEffect(() => {
      let raf = null
      const start = performance.now()
      const from = display
      const to = Number(value) || 0
      const duration = 700
      function step (t) {
        const d = Math.min(1, (t - start) / duration)
        const eased = 1 - Math.pow(1 - d, 3)
        const cur = from + (to - from) * eased
        setDisplay(cur)
        if (d < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])
    return (
      <span className={className}>
        {prefix}
        {Number(display).toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        })}
      </span>
    )
  }

  // small helper to abbreviate address
  function shortAcct (a) {
    if (!a) return ''
    return a.slice(0, 6) + '...' + a.slice(-4)
  }

  return (
    <div className='root'>
      {/* particles canvas */}
      <canvas ref={canvasRef} className='particles' aria-hidden />

      {/* header */}
      <header className='header'>
        <div className='logoWrap'>
          <div className='logo'>Web3Co</div>
          <div className='tag'>Next-gen wallet & exchange</div>
        </div>

        <nav className={`nav${menuOpen ? ' open' : ''}`} aria-label='Main'>
          <ul>
            <li>
              <a href='#features'>Features</a>
            </li>
            <li>
              <a href='#markets'>Markets</a>
            </li>
            <li>
              <a href='#token'>Token</a>
            </li>
            <li>
              <a href='#docs'>Docs</a>
            </li>
            <li>
              <a href='#contact'>Contact</a>
            </li>
          </ul>
        </nav>

        <div className='headerActions'>
          <div className='priceChips' aria-hidden>
            <div className='priceChip'>
              <div className='priceLabel'>BTC</div>
              <div className='priceValue'>
                <AnimatedNumber
                  value={prices.btc?.usd ?? 0}
                  decimals={0}
                  prefix='$'
                />
                <small
                  className='change'
                  style={{
                    color:
                      (prices.btc?.change24h ?? 0) >= 0 ? '#16c784' : '#ff6b6b'
                  }}
                >
                  {(prices.btc?.change24h ?? 0).toFixed(2)}%
                </small>
              </div>
            </div>
            <div className='priceChip'>
              <div className='priceLabel'>ETH</div>
              <div className='priceValue'>
                <AnimatedNumber
                  value={prices.eth?.usd ?? 0}
                  decimals={0}
                  prefix='$'
                />
                <small
                  className='change'
                  style={{
                    color:
                      (prices.eth?.change24h ?? 0) >= 0 ? '#16c784' : '#ff6b6b'
                  }}
                >
                  {(prices.eth?.change24h ?? 0).toFixed(2)}%
                </small>
              </div>
            </div>
          </div>

          <div className='walletWrap'>
            {connected ? (
              <div className='connected'>
                <button
                  className='smallBtn'
                  onClick={() => window.navigator.clipboard?.writeText(account)}
                >
                  {shortAcct(account)}
                </button>
                <button className='ghost' onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
            ) : (
              <div className='connectBtns'>
                <button className='primary' onClick={connectWallet}>
                  Connect Wallet
                </button>
                <button
                  className='ghost'
                  onClick={() => window.open('/download', '_blank')}
                >
                  Download App
                </button>
              </div>
            )}
          </div>

          <button
            aria-label='Toggle menu'
            className={`hamburger${menuOpen ? ' active' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className='mobileOverlay'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
          )}
        </AnimatePresence>
      </header>

      {/* hero content */}
      <main className='hero'>
        <section className='left'>
          <motion.h1
            initial={{ y: 25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
          >
            Next-Gen <span className='gradient'>Crypto Platform</span>
          </motion.h1>
          <motion.p
            className='lead'
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Trade, stake, and manage your portfolio — <strong>securely</strong>{' '}
            and lightning fast. Built with zero trust on-chain integrations and
            privacy-first architecture.
          </motion.p>

          <motion.form
            className='form'
            onSubmit={e => e.preventDefault()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <input
              aria-label='email'
              type='email'
              placeholder='Enter email for early access'
            />
            <button className='cta'>Join Early Access</button>
          </motion.form>

          <motion.div
            className='featureGrid'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className='feature'>
              <div className='fIcon'>🔒</div>
              <div>
                <div className='fTitle'>On-Chain Security</div>
                <div className='fDesc'>Multi-sig & hardware support.</div>
              </div>
            </div>
            <div className='feature'>
              <div className='fIcon'>⚡</div>
              <div>
                <div className='fTitle'>Immediate Settlement</div>
                <div className='fDesc'>Layer-2 support & MEV protection.</div>
              </div>
            </div>
            <div className='feature'>
              <div className='fIcon'>🌐</div>
              <div>
                <div className='fTitle'>Cross-Chain</div>
                <div className='fDesc'>Bridges with fraud proofs.</div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className='right'>
          <motion.div
            className='card'
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className='cardHeader'>
              <div>
                <div className='cardTitle'>Portfolio Overview</div>
                <div className='cardSub'>
                  Real-time balances & account health
                </div>
              </div>
              <div className='cardKPI'>
                <AnimatedNumber
                  value={7488223}
                  decimals={0}
                  className='kpiNum'
                  prefix=''
                />
                <div className='kpiLabel'>Users helped</div>
              </div>
            </div>

            <div className='liveChart'>
              {/* placeholder animated mini chart: CSS gradient + moving overlay */}
              <div className='miniChart' aria-hidden>
                <div className='miniChartShimmer' />
              </div>

              <div className='marketRow'>
                <div>
                  <div className='sym'>BTC / USDT</div>
                  <div className='priceWrap'>
                    <AnimatedNumber
                      value={prices.btc?.usd ?? 67800}
                      decimals={0}
                      prefix='$'
                      className='priceBig'
                    />
                    <small
                      className='pct'
                      style={{
                        color:
                          (prices.btc?.change24h ?? 0) >= 0
                            ? '#16c784'
                            : '#ff6b6b'
                      }}
                    >
                      {(prices.btc?.change24h ?? 0).toFixed(2)}%
                    </small>
                  </div>
                </div>
                <div>
                  <button className='ghost'>Trade</button>
                </div>
              </div>

              <div className='marketRow'>
                <div>
                  <div className='sym'>ETH / USDT</div>
                  <div className='priceWrap'>
                    <AnimatedNumber
                      value={prices.eth?.usd ?? 1700}
                      decimals={0}
                      prefix='$'
                      className='priceBig'
                    />
                    <small
                      className='pct'
                      style={{
                        color:
                          (prices.eth?.change24h ?? 0) >= 0
                            ? '#16c784'
                            : '#ff6b6b'
                      }}
                    >
                      {(prices.eth?.change24h ?? 0).toFixed(2)}%
                    </small>
                  </div>
                </div>
                <div>
                  <button className='ghost'>Trade</button>
                </div>
              </div>
            </div>

            <div className='cardFooter'>
              <div className='smallText'>
                Connect your wallet to see balances
              </div>
              <div className='footerActions'>
                <button className='primary' onClick={connectWallet}>
                  {connected ? 'Open Wallet' : 'Connect Wallet'}
                </button>
                <button
                  className='ghost'
                  onClick={() => window.open('/learn', '_blank')}
                >
                  Learn
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* optional CTAs / footer micro */}
      <div className='microCTA'>
        <div>Built with privacy-first principals • Try the demo on testnet</div>
        <div>
          <a href='/docs' className='link'>
            Docs
          </a>
          <a href='/token' className='link'>
            Token
          </a>
        </div>
      </div>
    </div>
  )
}
