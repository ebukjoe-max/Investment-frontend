'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Copy, Upload } from 'lucide-react'

import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import { uploadToCloudinary } from '../../context/uploadToCloudinary'
import { getVerifiedUserId } from '../../context/UnHashedUserId'

export default function DepositPage () {
  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState(null)
  const [token, setToken] = useState(null)
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState('')
  const [method, setMethod] = useState('crypto')
  const [amount, setAmount] = useState('')
  const [coinRate, setCoinRate] = useState(1)
  const [convertedAmount, setConvertedAmount] = useState(0)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  })
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Fetch user wallets
  useEffect(() => {
    const fetchUser = async () => {
      const userId = await getVerifiedUserId()
      setUserId(userId)
      const token = localStorage.getItem('authToken')
      setToken(token)
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
        setUser(res.data.user)
        setWallets(res.data.wallets)
      } catch (err) {
        console.error('Error fetching user:', err)
      }
    }
    fetchUser()
  }, [])

  // Fetch live coin price
  useEffect(() => {
    const fetchRate = async () => {
      if (!selectedWallet) return
      const wallet = wallets.find(w => w._id === selectedWallet)
      if (!wallet) return
      setSelectedSymbol(wallet.symbol)

      try {
        const res = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${wallet.symbol.toLowerCase()}&vs_currencies=usd`
        )
        const rate = res.data[wallet.symbol.toLowerCase()]?.usd
        setCoinRate(rate || 1)
      } catch (err) {
        console.error('Error fetching coin rate:', err)
      }
    }
    fetchRate()
  }, [selectedWallet, wallets])

  // Converted amount
  useEffect(() => {
    if (!amount || isNaN(amount)) {
      setConvertedAmount(0)
    } else {
      const conv = parseFloat(amount) / coinRate
      setConvertedAmount(Number.isFinite(conv) ? conv : 0)
    }
  }, [amount, coinRate])

  const handleFileUpload = async () => {
    if (!receipt) return null
    try {
      return await uploadToCloudinary(receipt)
    } catch (err) {
      setSnackbar({
        show: true,
        message: 'Failed to upload document',
        type: 'error'
      })
      return null
    }
  }

  // Handle deposit

  const handleDeposit = async () => {
    if (!receipt) {
      setSnackbar({
        open: true,
        message: 'Please upload a payment receipt before proceeding.',
        severity: 'error'
      })
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid deposit amount.',
        severity: 'error'
      })
      return
    }

    setIsSubmitting(true) // ✅ Disable button

    const documentUrl = await handleFileUpload()
    if (!documentUrl) {
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {
        userId,
        walletsymbol: selectedSymbol,
        walletId: selectedWallet,
        method,
        amount: parseFloat(amount),
        coinRate,
        convertedAmount,
        receipt: documentUrl
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions/deposit`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setSnackbar({
        open: true,
        message: 'Deposit submitted. Awaiting admin approval.',
        severity: 'success'
      })
      setAmount('')
      setReceipt(null)
      setIsConfirming(false) // ✅ Reset confirming state
    } catch (err) {
      console.error(err)
      setSnackbar({
        open: true,
        message: 'Failed to create deposit. Try again later.',
        severity: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modify copyToClipboard
  const copyToClipboard = async (text, type = 'wallet') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setCopied(true)

      // ✅ Only confirm if it's a wallet
      if (type === 'wallet') {
        setIsConfirming(true)
        setSnackbar({
          open: true,
          message:
            'Wallet address copied. Please make payment and upload receipt.',
          severity: 'info'
        })
      } else {
        setSnackbar({
          open: true,
          message: 'Copied successfully.',
          severity: 'success'
        })
      }
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const renderInstructions = () => {
    if (method === 'crypto' && selectedWallet) {
      const wallet = wallets.find(w => w._id === selectedWallet)
      const shortenAddress = address => {
        if (!address) return ''
        return address.length > 12
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : address
      }

      return (
        <div className='instruction-card'>
          <p className='label'>Send {wallet.symbol} to:</p>
          <div className='copy-box'>
            <span>{shortenAddress(wallet.walletAddress)}</span>

            <Copy
              onClick={() => copyToClipboard(wallet.walletAddress)}
              size={18}
            />
          </div>
        </div>
      )
    }
    if (method === 'bank') {
      return (
        <div className='instruction-card'>
          <p className='label'>Bank Transfer Details:</p>
          <p>Bank: Example Bank</p>
          <span>
            Acc No: 2006448310
            <Copy onClick={() => copyToClipboard('2006448310')} size={18} />
          </span>
          <p>Name: thurderXTorm Ltd</p>
        </div>
      )
    }
    if (method === 'cashapp') {
      return (
        <div className='instruction-card'>
          <p className='label'>CashApp Tag:</p>
          <div className='copy-box'>
            <span>$thurderXTorm</span>
            <Copy onClick={() => copyToClipboard('$thurderXTorm')} size={18} />
          </div>
        </div>
      )
    }
    if (method === 'googlepay') {
      return (
        <div className='instruction-card'>
          <p className='label'>Google Pay ID:</p>
          <span>
            thurderxtorm@bank.com{' '}
            <Copy
              onClick={() => copyToClipboard('thurderxtorm@bank.com')}
              size={18}
            />
          </span>
        </div>
      )
    }
    if (method === 'applepay') {
      return (
        <div className='instruction-card'>
          <p className='label'>Apple Pay ID:</p>
          <span>
            thurderxtorm@icloud.com{' '}
            <Copy
              onClick={() => copyToClipboard('thurderxtorm@icloud.com ')}
              size={18}
            />
          </span>
        </div>
      )
    }
    if (method === 'card') {
      return (
        <div className='instruction-card'>
          <p className='label'>Card Payment:</p>
          <span>Proceed securely via Stripe Checkout</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className='page'>
      <div className='deposit-container'>
        {/* Sponsor bar */}
        <div className='sponsor-bar'>
          <p>
            ⚡ Deposits processed securely by <b>ThunderXTorm</b>
          </p>
        </div>

        <div className='form-group'>
          <label>Select Wallet</label>
          <select
            value={selectedWallet}
            onChange={e => setSelectedWallet(e.target.value)}
          >
            <option value=''>-- Select Wallet --</option>
            {wallets.map(w => (
              <option key={w._id} value={w._id}>
                {w.symbol} ({w.network})
              </option>
            ))}
          </select>
        </div>

        <div className='form-group'>
          <label>Deposit Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option value='crypto'>Crypto</option>
            <option value='bank'>Bank Transfer</option>
            <option value='cashapp'>CashApp</option>
            <option value='googlepay'>Google Pay</option>
            <option value='applepay'>Apple Pay</option>
            <option value='card'>Card</option>
          </select>
        </div>

        <div className='form-group'>
          <label>Amount (USD)</label>
          <input
            type='number'
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder='Enter amount in USD'
          />
        </div>

        {convertedAmount > 0 && (
          <div className='conversion-box'>
            <p>
              You’ll receive approx{' '}
              <b>
                ${convertedAmount} worth of {selectedSymbol}
              </b>
            </p>
          </div>
        )}

        {renderInstructions()}

        {/* Upload receipt */}
        <div className='form-group'>
          <label>Upload Receipt</label>
          <div className='upload-box'>
            <input
              type='file'
              accept='image/*'
              onChange={e => setReceipt(e.target.files[0])}
            />
            {receipt && <span>{receipt.name}</span>}
            {/* <Upload size={18} /> */}
          </div>
        </div>

        <button
          className='deposit-btn'
          onClick={handleDeposit}
          disabled={!isConfirming || !receipt || isSubmitting}
        >
          {isSubmitting
            ? 'Submitting...'
            : !isConfirming
            ? 'Copy Deposit details to Proceed'
            : receipt
            ? 'Submit Deposit'
            : 'Awaiting Receipt...'}
        </button>
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <MuiAlert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          elevation={6}
          variant='filled'
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  )
}
