'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { uploadToCloudinary } from '../../context/uploadToCloudinary'
import { getVerifiedUserId } from '../../context/UnHashedUserId'
import { toast } from 'react-toastify'

// (Optional) simple popup component retained
const Popup = ({ message, type, onClose }) => (
  <div className='fixed inset-0 flex items-center justify-center bg-black/50 z-50'>
    <div
      className={`p-6 rounded-2xl shadow-lg text-center w-96 ${
        type === 'success'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      <h3 className='text-lg font-bold mb-3'>
        {type === 'success' ? '✅ Success' : '❌ Error'}
      </h3>
      <p className='mb-4'>{message}</p>
      <button
        onClick={onClose}
        className='px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition'
      >
        Close
      </button>
    </div>
  </div>
)

export default function LoanApplicationPage () {
  const [wallets, setWallets] = useState([])
  const [loans, setLoans] = useState([])
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [proof, setProof] = useState(null)
  const [userId, setUserId] = useState(null)
  const [token, setToken] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popup, setPopup] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const uid = await getVerifiedUserId()
        setUserId(uid)
        const tkn = localStorage.getItem('authToken')
        setToken(tkn)

        if (!uid || !tkn) return

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${uid}`,
          {
            headers: { Authorization: `Bearer ${tkn}` }
          }
        )

        if (res.data?.wallets) {
          setWallets(res.data.wallets)
        } else {
          setWallets([])
        }
      } catch (err) {
        console.error('Error fetching wallets:', err)
        toast.error('Failed to load wallets')
      }
    }

    fetchWallets()
  }, [])

  // Fetch loan plans once we have token (safe check)
  useEffect(() => {
    if (!token) return
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/loans/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setLoans(res.data.data || []))
      .catch(err => {
        console.error('Failed to load loans:', err)
      })
  }, [token])

  const handleFileUpload = async () => {
    if (!proof) return null
    try {
      return await uploadToCloudinary(proof)
    } catch (err) {
      console.error('Upload failed:', err)
      setPopup({
        show: true,
        message: 'Failed to upload document',
        type: 'error'
      })
      return null
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const selectedWallet = wallets.find(w => w._id === selectedWalletId)
      const selectedLoan = loans.find(l => l._id === selectedLoanId)

      if (!selectedWallet || !selectedLoan) {
        toast.error('Please select a wallet and a loan plan')
        setIsSubmitting(false)
        return
      }

      if (
        loanAmount < selectedLoan.minAmount ||
        loanAmount > selectedLoan.maxAmount
      ) {
        toast.error(
          `Loan amount must be between $${selectedLoan.minAmount} and $${selectedLoan.maxAmount}`
        )
        setIsSubmitting(false)
        return
      }

      const maxLoan = selectedWallet.balance * 0.6
      if (loanAmount > maxLoan) {
        toast.error('Loan amount exceeds your eligible wallet collateral.')
        setIsSubmitting(false)
        return
      }

      const documentUrl = await handleFileUpload()
      if (!documentUrl) {
        toast.error('Please upload a valid document before submitting.')
        setIsSubmitting(false)
        return
      }

      const data = {
        userId,
        walletId: selectedWalletId,
        amount: Number(loanAmount),
        term: selectedLoan.term,
        loanId: selectedLoan._id,
        documentUrl,
        coin: selectedWallet.symbol
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/loans/applyforloan`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      toast.success('Loan application submitted successfully!')

      // reset
      setLoanAmount('')
      setSelectedLoanId('')
      setSelectedWalletId('')
      setProof(null)
    } catch (err) {
      console.error(err.response?.data || err)
      toast.error(err.response?.data?.message || 'Failed to apply for loan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='page'>
      <div className='deposit-container'>
        {/* Sponsor bar (same as deposit) */}
        <div className='sponsor-bar'>
          <p>
            ⚡ Loan Sponsored by <b>Binance</b>
          </p>
        </div>

        <form className='deposit-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label>Select Wallet</label>
            <select
              value={selectedWalletId}
              onChange={e => setSelectedWalletId(e.target.value)}
            >
              <option value=''>-- Select Wallet --</option>
              {wallets.map(wallet => (
                <option key={wallet._id} value={wallet._id}>
                  {wallet.symbol} - $
                  {Number(wallet.balance || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className='form-group'>
            <label>Select Loan Plan</label>
            <select
              value={selectedLoanId}
              onChange={e => setSelectedLoanId(e.target.value)}
            >
              <option value=''>-- Select Loan --</option>
              {loans.map(loan => (
                <option key={loan._id} value={loan._id}>
                  {loan.name} ({loan.interestRate}% {loan.interestType})
                </option>
              ))}
            </select>
          </div>

          <div className='form-group'>
            <label>Loan Amount</label>
            <input
              type='number'
              placeholder='Enter amount in USD'
              value={loanAmount}
              onChange={e => setLoanAmount(e.target.value)}
            />
          </div>

          <div className='form-group'>
            <label>Upload Verified ID (eg Passport)</label>
            <div className='upload-box'>
              <input
                type='file'
                accept='image/*,application/pdf'
                onChange={e => setProof(e.target.files[0])}
              />
              {proof && <span className='file-name'>{proof.name}</span>}
            </div>
          </div>

          {/* Loan Summary - uses deposit-style conversion box */}
          {selectedLoanId && loanAmount && (
            <div className='conversion-box'>
              <h4>Loan Summary</h4>
              {(() => {
                const loan = loans.find(l => l._id === selectedLoanId)
                if (!loan) return null

                const rate = loan.interestRate / 100
                const amount = Number(loanAmount || 0)
                const interest = amount * rate
                const totalRepayment = amount + interest

                let periods = 1
                if (loan.repaymentFrequency === 'Weekly') {
                  periods =
                    loan.durationType === 'months'
                      ? loan.duration * 4
                      : Math.ceil(loan.duration / 7)
                } else if (loan.repaymentFrequency === 'Bi-weekly') {
                  periods =
                    loan.durationType === 'months'
                      ? loan.duration * 2
                      : Math.ceil(loan.duration / 14)
                } else if (loan.repaymentFrequency === 'Monthly') {
                  periods =
                    loan.durationType === 'months'
                      ? loan.duration
                      : loan.duration / 30
                }

                const installment = totalRepayment / (periods || 1)

                return (
                  <div className='summary'>
                    <p>
                      <strong>Loan Amount:</strong> ${amount.toLocaleString()}
                    </p>
                    <p>
                      <strong>Interest ({loan.interestRate}%):</strong> $
                      {interest.toFixed(2)}
                    </p>
                    <p>
                      <strong>Total Repayment:</strong> $
                      {totalRepayment.toFixed(2)}
                    </p>
                    <p>
                      <strong>Repayment Plan:</strong> {periods} payments of $
                      {installment.toFixed(2)} each ({loan.repaymentFrequency})
                    </p>
                    <p>
                      <strong>Duration:</strong> {loan.duration}{' '}
                      {loan.durationType}
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          <div className='form-group'>
            <button
              type='submit'
              className={`deposit-btn ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>

      {/* popup (optional) */}
      {popup.show && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  )
}
