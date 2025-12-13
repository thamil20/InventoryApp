import React, { useState, useEffect } from "react"
import { useAuth } from './AuthContext'
import "./SoldItemsList.css"

const SoldItemsList = () => {
    const { token } = useAuth()
    const [soldItems, setSoldItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterColumn, setFilterColumn] = useState('all')
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

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

    // Filter and search logic
    const filteredItems = soldItems.filter(item => {
        if (!searchTerm) return true
        
        const searchLower = searchTerm.toLowerCase()
        
        if (filterColumn === 'all') {
            return (
                item.name.toLowerCase().includes(searchLower) ||
                item.quantitySold.toString().includes(searchLower) ||
                item.salePrice.toString().includes(searchLower) ||
                item.price.toString().includes(searchLower) ||
                (item.description && item.description.toLowerCase().includes(searchLower)) ||
                (item.category && item.category.toLowerCase().includes(searchLower))
            )
        }
        
        // Filter by specific column
        const value = item[filterColumn]
        if (value === null || value === undefined) return false
        return value.toString().toLowerCase().includes(searchLower)
    })

    // Sort logic
    const sortedItems = [...filteredItems].sort((a, b) => {
        if (!sortConfig.key) return 0

        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) aValue = ''
        if (bValue === null || bValue === undefined) bValue = ''

        // Convert to lowercase for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase()
        if (typeof bValue === 'string') bValue = bValue.toLowerCase()

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const getSortIndicator = (columnKey) => {
        if (sortConfig.key !== columnKey) return ' ↕'
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
    }

    return <div className="inventory-container">
        <div className="inventory-header">
            <h2>Sold Items</h2>
        </div>
        <div className="search-filter-container">
            <select 
                value={filterColumn} 
                onChange={(e) => setFilterColumn(e.target.value)}
                className="filter-dropdown"
            >
                <option value="all">All Columns</option>
                <option value="name">Item Name</option>
                <option value="quantitySold">Quantity Sold</option>
                <option value="salePrice">Sale Price</option>
                <option value="price">Original Price</option>
                <option value="category">Category</option>
                <option value="description">Description</option>
            </select>
            <input
                type="text"
                placeholder={`Search ${filterColumn === 'all' ? 'all columns' : filterColumn}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="clear-search-btn">
                    ✕
                </button>
            )}
        </div>
        <div className="inventory-table-wrapper">
            {soldItems.length === 0 ? (
                <div className="empty-state">
                    <p>No sold items</p>
                </div>
            ) : sortedItems.length === 0 ? (
                <div className="empty-state">
                    <p>No items match your search</p>
                </div>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} className="sortable-header">
                                Item Name{getSortIndicator('name')}
                            </th>
                            <th onClick={() => handleSort('quantitySold')} className="sortable-header">
                                Quantity Sold{getSortIndicator('quantitySold')}
                            </th>
                            <th onClick={() => handleSort('salePrice')} className="sortable-header">
                                Sale Price{getSortIndicator('salePrice')}
                            </th>
                            <th onClick={() => handleSort('price')} className="sortable-header">
                                Original Price{getSortIndicator('price')}
                            </th>
                            <th onClick={() => handleSort('saleDate')} className="sortable-header">
                                Sale Date{getSortIndicator('saleDate')}
                            </th>
                            <th onClick={() => handleSort('category')} className="sortable-header">
                                Category{getSortIndicator('category')}
                            </th>
                            <th onClick={() => handleSort('description')} className="sortable-header">
                                Description{getSortIndicator('description')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => (
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
