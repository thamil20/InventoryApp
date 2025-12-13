import React, { useState, useEffect } from "react"
import { useAuth } from './AuthContext'
import "./SoldItemsList.css"

const SoldItemsList = () => {
    const { token } = useAuth()
    const [soldItems, setSoldItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        fetchSoldItems()
    }, [])

    const fetchSoldItems = async () => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/sold`
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setSoldItems(data.sold_items)
            console.log(data.sold_items)
        } catch (error) {
            console.error("Error fetching sold items:", error)
        }
    }

    const formatDate = (isoDate) => {
        if (!isoDate) return 'N/A'
        const date = new Date(isoDate)
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        })
    }

    const openItemDetails = (item) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedItem(null)
    }

    return <div className="inventory-container">
        <div className="inventory-header">
            <h2>Sold Items</h2>
        </div>
        <div className="inventory-table-wrapper">
            {soldItems.length === 0 ? (
                <div className="empty-state">
                    <p>No sold items</p>
                </div>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Quantity Sold</th>
                            <th>Sale Price</th>
                            <th>Original Price</th>
                            <th>Sale Date</th>
                            <th>Category</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {soldItems.map((item) => (
                            <tr key={item.soldItemId} onClick={() => openItemDetails(item)} className="clickable-row">
                                <td title={item.name}>{item.name}</td>
                                <td title={item.quantitySold}>{item.quantitySold}</td>
                                <td title={`$${item.salePrice.toFixed(2)}`}>${item.salePrice.toFixed(2)}</td>
                                <td title={`$${item.price.toFixed(2)}`}>${item.price.toFixed(2)}</td>
                                <td title={formatDate(item.saleDate)}>{formatDate(item.saleDate)}</td>
                                <td title={item.category}>{item.category}</td>
                                <td title={item.description}>{item.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
        {isModalOpen && selectedItem && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Sold Item Details</h3>
                        <button className="modal-close" onClick={closeModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="detail-row">
                            <span className="detail-label">Item Name:</span>
                            <span className="detail-value">{selectedItem.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Quantity Sold:</span>
                            <span className="detail-value">{selectedItem.quantitySold}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Sale Price:</span>
                            <span className="detail-value">${selectedItem.salePrice.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Original Price:</span>
                            <span className="detail-value">${selectedItem.price.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Total Sale Value:</span>
                            <span className="detail-value">${(selectedItem.salePrice * selectedItem.quantitySold).toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Sale Date:</span>
                            <span className="detail-value">{formatDate(selectedItem.saleDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Category:</span>
                            <span className="detail-value">{selectedItem.category}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{selectedItem.description}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Originally Added:</span>
                            <span className="detail-value">{formatDate(selectedItem.addedDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Original Item ID:</span>
                            <span className="detail-value">{selectedItem.originalItemId || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
}

export default SoldItemsList
