'use client'
import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import InvestmentPlansDisplay from '../Components/InvestmentPlanDisplay'

export default function AdvancedCryptoHero () {
  // UI state
  const [menuOpen, setMenuOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState(null)
  const [network, setNetwork] = useState(null)

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

  // --- MOBILE NAV DROPDOWN ---
  // This lets mobile nav be a dropdown, logo always visible
  const MOBILE_NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'Markets', href: '#markets' },
    { label: 'investment', href: '#investment' },
    { label: 'Loans', href: '#Loans' },
    { label: 'Trading Bot', href: '#Trading Bot' },
    { label: 'Token', href: '#token' },
    { label: 'Docs', href: '#docs' },
    { label: 'Contact', href: '#contact' },
    { label: 'Login', href: '#login' },
    { label: 'Register', href: '#register' }
  ]

  return (
    <div className='root'>
      {/* particles canvas */}
      <video autoPlay loop muted playsInline className='bg-video'>
        <source
          src='https://cdn.pixabay.com/video/2025/06/27/288182_large.mp4'
          type='video/mp4'
        />
      </video>

      <div className='overlay'></div>

      {/* header */}
      <header className='header'>
        <div className='logoWrap'>
          <div className='logo'>Web3Co</div>
          <div className='tag'>Next-gen wallet & exchange</div>
        </div>

        {/* Desktop nav (hidden on mobile) */}
        <nav className={`nav${menuOpen ? ' open' : ''}`} aria-label='Main'>
          <ul>
            <li>
              <a href='#features'>Features</a>
            </li>
            <li>
              <a href='#markets'>Markets</a>
            </li>
            <li>
              <a href='#Investment'>Investment</a>
            </li>
            <li>
              <a href='#Loans'>Loans</a>
            </li>
            <li>
              <a href='#Loans'>Trading Bot</a>
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
            <li>
              <a href='#contact'>Login</a>
            </li>
            <li>
              <a href='#contact'>Register</a>
            </li>
          </ul>
        </nav>

        <div className='headerActions'>
          {/* <div className='priceChips' aria-hidden>
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
          </div> */}

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
                  Connect
                </button>
                <button
                  className='ghost'
                  onClick={() => window.open('/download', '_blank')}
                >
                  Register
                </button>
              </div>
            )}
          </div>

          <Menu
            className={`hamburger${menuOpen ? ' active' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
          />
        </div>
        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                className='mobileOverlay'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.nav
                id='mobile-menu'
                className='mobileDropdown'
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.25 }}
                aria-label='Mobile Main'
              >
                <ul>
                  {MOBILE_NAV_LINKS.map(link => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        tabIndex={menuOpen ? 0 : -1}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* hero content */}
      <InvestmentPlansDisplay />
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
