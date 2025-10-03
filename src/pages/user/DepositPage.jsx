'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Copy } from 'lucide-react'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import { uploadToCloudinary } from '../../context/uploadToCloudinary'
import { getVerifiedUserId } from '../../context/UnHashedUserId'

// Stripe
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

// Load stripe with your public key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// Custom form styles for CardElement
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontSize: '16px',
      '::placeholder': { color: '#aab7c4' }
    },
    invalid: { color: '#fa755a' }
  }
}

/** ✅ Stripe Payment Form */
function CardPaymentForm ({
  amount,
  userId,
  token,
  setSnackbar,
  setIsSubmitting
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleCardPayment = async () => {
    if (!stripe || !elements) return

    try {
      setIsSubmitting(true)

      // Step 1: create PaymentIntent
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payment/create-payment-intent`,
        { userId, amount: parseFloat(amount), currency: 'usd', method: 'card' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { clientSecret } = res.data

      // Step 2: confirm card payment
      const card = elements.getElement(CardElement)
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card }
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.paymentIntent.status === 'succeeded') {
        setSnackbar({
          open: true,
          message: 'Card payment successful! ✅',
          severity: 'success'
        })
      }
    } catch (err) {
      console.error('Card payment failed:', err)
      setSnackbar({
        open: true,
        message: 'Card payment failed. ' + err.message,
        severity: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='card-payment-box'>
      <CardElement options={CARD_ELEMENT_OPTIONS} />
      <button
        className='deposit-btn'
        onClick={handleCardPayment}
        disabled={!stripe}
      >
        Pay ${amount} with Card
      </button>
    </div>
  )
}

/** ✅ Deposit Page */
function DepositPageContent () {
  const [user, setUser] = useState(null)
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
  const handleSnackbarClose = () =>
    setSnackbar(prev => ({ ...prev, open: false }))

  /** ✅ Fetch user and wallets */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const id = await getVerifiedUserId()
        setUserId(id)

        const localToken =
          typeof window !== 'undefined'
            ? localStorage.getItem('authToken')
            : null
        setToken(localToken)

        if (!id || !localToken) return

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${id}`,
          { headers: { Authorization: `Bearer ${localToken}` } }
        )

        setUser(res.data.user)
        setWallets(res.data.wallets || [])
      } catch (err) {
        console.error('Error fetching user:', err)
      }
    }
    fetchUser()
  }, [])

  /** ✅ Fetch coin rate */
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
        setCoinRate(res.data[wallet.symbol.toLowerCase()]?.usd || 1)
      } catch (err) {
        console.error('Error fetching coin rate:', err)
      }
    }
    fetchRate()
  }, [selectedWallet, wallets])

  /** ✅ Update converted amount */
  useEffect(() => {
    if (!amount || isNaN(amount)) {
      setConvertedAmount(0)
    } else {
      const conv = parseFloat(amount) / coinRate
      setConvertedAmount(Number.isFinite(conv) ? conv : 0)
    }
  }, [amount, coinRate])

  /** ✅ Upload file */
  const handleFileUpload = async () => {
    if (!receipt) return null
    try {
      return await uploadToCloudinary(receipt)
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to upload document',
        severity: 'error'
      })
      return null
    }
  }

  /** ✅ Handle deposit for non-card methods */
  const handleDeposit = async () => {
    if (method === 'card') return // handled by Stripe form

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

    setIsSubmitting(true)
    const documentUrl = await handleFileUpload()
    if (!documentUrl) {
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {
        userId,
        walletSymbol: selectedSymbol,
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
      setIsConfirming(false)
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

  /** ✅ Copy helper */
  const copyToClipboard = async (text, type = 'wallet') => {
    try {
      await navigator.clipboard.writeText(text)
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

  /** ✅ Render instructions */
  const renderInstructions = () => {
    const wallet = wallets.find(w => w._id === selectedWallet)
    const shorten = a =>
      !a ? '' : a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a

    switch (method) {
      case 'crypto':
        return (
          wallet && (
            <div className='instruction-card'>
              <p className='label'>Send {wallet.symbol} to:</p>
              <div className='copy-box'>
                <span>{shorten(wallet.walletAddress)}</span>
                <Copy
                  onClick={() => copyToClipboard(wallet.walletAddress)}
                  size={18}
                />
              </div>
            </div>
          )
        )
      case 'cashapp':
        return (
          <div className='instruction-card'>
            <p className='label'>CashApp Tag:</p>
            <span>$thurderXTorm</span>
          </div>
        )
      case 'googlepay':
        return (
          <div className='instruction-card'>
            <p className='label'>Google Pay ID:</p>
            <span>thurderxtorm@bank.com</span>
          </div>
        )
      case 'applepay':
        return (
          <div className='instruction-card'>
            <p className='label'>Apple Pay ID:</p>
            <span>thurderxtorm@icloud.com</span>
          </div>
        )
      case 'card':
        return (
          <div className='instruction-card'>
            <p className='label'>Card Payment:</p>
            <span>Enter card details below</span>
          </div>
        )
      default:
        return null
    }
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

        {/* Wallet selection */}
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

        {/* Method */}
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

        {/* Amount */}
        <div className='form-group'>
          <label>Amount (USD)</label>
          <input
            type='number'
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder='Enter amount in USD'
          />
        </div>

        {/* Conversion */}
        {convertedAmount > 0 && method !== 'card' && (
          <div className='conversion-box'>
            <p>
              You’ll receive approx{' '}
              <b>
                {convertedAmount.toFixed(6)} {selectedSymbol}
              </b>
            </p>
          </div>
        )}

        {/* Instructions */}
        {renderInstructions()}

        {/* Card form if selected */}
        {method === 'card' && (
          <CardPaymentForm
            amount={amount}
            userId={userId}
            token={token}
            setSnackbar={setSnackbar}
            setIsSubmitting={setIsSubmitting}
          />
        )}

        {/* Upload receipt for crypto/etc */}
        {method !== 'card' && (
          <div className='form-group'>
            <label>Upload Receipt</label>
            <div className='upload-box'>
              <input
                type='file'
                accept='image/*'
                onChange={e => setReceipt(e.target.files[0])}
              />
              {receipt && <span>{receipt.name}</span>}
            </div>
          </div>
        )}

        {/* Submit button */}
        {method !== 'card' && (
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
        )}
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

/** ✅ Wrap with Elements */
export default function DepositPage () {
  return (
    <Elements stripe={stripePromise}>
      <DepositPageContent />
    </Elements>
  )
}
