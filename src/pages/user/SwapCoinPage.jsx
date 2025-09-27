'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  CircularProgress
} from '@mui/material'
import { getVerifiedUserId } from '../../context/UnHashedUserId'

// ✅ Map wallet symbols to CoinGecko IDs
const symbolToId = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  SOL: 'solana',
  TRX: 'tron',
  MATIC: 'polygon'
}

export default function SwapCoinPage () {
  const [wallets, setWallets] = useState([])
  const [coinRates, setCoinRates] = useState({})
  const [availableCoins, setAvailableCoins] = useState([])
  const [fromCoin, setFromCoin] = useState('BTC')
  const [toCoin, setToCoin] = useState('USDT')
  const [amount, setAmount] = useState('')
  const [receiveAmount, setReceiveAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState(false)

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  // ✅ Fetch wallets and live rates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await getVerifiedUserId()
        if (!userId || !token) {
          window.location.href = '/auth/Login'
          return
        }

        // Get user wallets
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const userWallets = res.data.wallets || []
        setWallets(userWallets)

        // Extract only supported coins
        const walletSymbols = userWallets
          .map(w => w.symbol.toUpperCase())
          .filter(s => symbolToId[s])

        setAvailableCoins(walletSymbols)

        if (walletSymbols.length > 0) {
          // Fetch rates from CoinGecko
          const ids = walletSymbols.map(s => symbolToId[s]).join(',')
          const coinRes = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price`,
            {
              params: {
                ids,
                vs_currencies: 'usd'
              }
            }
          )

          const rates = {}
          walletSymbols.forEach(symbol => {
            const id = symbolToId[symbol]
            rates[symbol] = coinRes.data[id]?.usd || 0
          })

          setCoinRates(rates)
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  // ✅ Auto calculate receive amount
  useEffect(() => {
    const fromRate = coinRates[fromCoin] // 1 fromCoin = ? USD
    const toRate = coinRates[toCoin] // 1 toCoin = ? USD

    if (fromRate && toRate && amount && fromCoin !== toCoin) {
      const usdAmount = parseFloat(amount) // amount is already in USD
      const fromCoinAmount = usdAmount / fromRate
      const toCoinAmount = usdAmount / toRate

      setReceiveAmount(toCoinAmount)
    } else {
      setReceiveAmount(0)
    }
  }, [amount, fromCoin, toCoin, coinRates])

  // ✅ Swap handler
  const handleSwap = async () => {
    const usdAmount = parseFloat(amount)
    if (!usdAmount || usdAmount <= 0) return alert('Enter a valid USD amount')
    if (fromCoin === toCoin) return alert('Cannot swap the same coin')

    const fromWallet = wallets.find(w => w.symbol === fromCoin)
    if (!fromWallet || usdAmount > fromWallet.balance)
      return alert('Insufficient balance in USD')

    try {
      setSwapping(true)
      const userId = await getVerifiedUserId()

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions/swap`,
        {
          userId,
          fromCoin,
          toCoin,
          amount: usdAmount, // ✅ send amount in USD
          receiveAmount // already in target coin units
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      alert(
        `✅ Swapped $${usdAmount} (${(usdAmount / coinRates[fromCoin]).toFixed(
          6
        )} ${fromCoin}) 
      to ${receiveAmount.toFixed(6)} ${toCoin}`
      )

      // Refresh wallets
      const updated = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setWallets(updated.data.wallets)
      setAmount('')
    } catch (err) {
      console.error('Swap failed:', err)
      alert('❌ Swap failed. Try again later.')
    } finally {
      setSwapping(false)
    }
  }

  const getBalance = symbol => {
    return wallets.find(w => w.symbol === symbol)?.balance || 0
  }

  if (loading) {
    return (
      <Box
        className='swappedCoinpage'
        display='flex'
        justifyContent='center'
        p={5}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className='swappedCoinpage'>
      <Paper className='swapBox' sx={{ p: 3 }}>
        <Typography variant='h6' gutterBottom>
          Coin Swap
        </Typography>

        <TextField
          select
          label='From'
          value={fromCoin}
          onChange={e => setFromCoin(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {availableCoins.map(symbol => (
            <MenuItem key={symbol} value={symbol}>
              {symbol} - Balance: {getBalance(symbol)} | Rate: $
              {coinRates[symbol] ?? '...'}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label='To'
          value={toCoin}
          onChange={e => setToCoin(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {availableCoins.map(symbol => (
            <MenuItem key={symbol} value={symbol}>
              {symbol} - Rate: ${coinRates[symbol] ?? '...'}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label='Amount in USD'
          type='number'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant='body2' sx={{ mb: 1 }}>
          Your {fromCoin} balance (in USD): ${getBalance(fromCoin)}
        </Typography>

        <Typography variant='body2' sx={{ mb: 1 }}>
          Equivalent in {fromCoin}:{' '}
          <strong>
            {(parseFloat(amount || 0) / coinRates[fromCoin]).toFixed(6)}{' '}
            {fromCoin}
          </strong>
        </Typography>

        <Typography variant='body2' sx={{ mb: 2 }}>
          You will receive:{' '}
          <strong>
            {receiveAmount.toFixed(6)} {toCoin}
          </strong>
        </Typography>

        <Button
          variant='contained'
          color='primary'
          fullWidth
          onClick={handleSwap}
          disabled={!amount || fromCoin === toCoin || swapping}
        >
          {swapping ? 'Swapping...' : 'Swap Coin'}
        </Button>
      </Paper>
    </Box>
  )
}
