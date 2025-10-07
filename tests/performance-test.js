/**
 * Performance Testing Script
 * 
 * Run: node tests/performance-test.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api'

async function makeRequest(url, label) {
  const start = Date.now()
  try {
    const response = await fetch(url)
    const data = await response.json()
    const duration = Date.now() - start
    
    const dataSize = JSON.stringify(data).length
    const sizeKB = (dataSize / 1024).toFixed(2)
    
    console.log(`✅ ${label}`)
    console.log(`   Time: ${duration}ms`)
    console.log(`   Size: ${sizeKB} KB`)
    console.log(`   Items: ${data.data?.items?.length || data.data?.length || 0}`)
    console.log('')
    
    return { duration, sizeKB, success: true }
  } catch (error) {
    const duration = Date.now() - start
    console.log(`❌ ${label}`)
    console.log(`   Error: ${error.message}`)
    console.log(`   Time: ${duration}ms\n`)
    
    return { duration, sizeKB: 0, success: false }
  }
}

async function runPerformanceTests() {
  console.log('🚀 Hot Wheels Manager - Performance Tests\n')
  console.log('=' .repeat(60))
  console.log('')
  
  const results = []
  
  // Test 1: Get inventory without filters
  results.push(
    await makeRequest(
      `${API_URL}/inventory?page=1&limit=15`,
      'GET /inventory (no filters, page 1)'
    )
  )
  
  // Test 2: Get inventory with filters
  results.push(
    await makeRequest(
      `${API_URL}/inventory?page=1&limit=15&brand=Hot Wheels&condition=mint`,
      'GET /inventory (brand + condition filters)'
    )
  )
  
  // Test 3: Search query
  results.push(
    await makeRequest(
      `${API_URL}/inventory?page=1&limit=15&search=Corvette`,
      'GET /inventory (search: Corvette)'
    )
  )
  
  // Test 4: Second page
  results.push(
    await makeRequest(
      `${API_URL}/inventory?page=2&limit=15`,
      'GET /inventory (page 2)'
    )
  )
  
  // Test 5: Get deliveries
  results.push(
    await makeRequest(
      `${API_URL}/deliveries`,
      'GET /deliveries (all)'
    )
  )
  
  // Test 6: Get customers
  results.push(
    await makeRequest(
      `${API_URL}/customers`,
      'GET /customers (all)'
    )
  )
  
  // Test 7: Get boxes
  results.push(
    await makeRequest(
      `${API_URL}/boxes`,
      'GET /boxes (all)'
    )
  )
  
  // Test 8: Parallel requests (simulating dashboard load)
  console.log('⏳ Running parallel requests (dashboard simulation)...')
  const parallelStart = Date.now()
  
  await Promise.all([
    fetch(`${API_URL}/inventory?page=1&limit=5`),
    fetch(`${API_URL}/deliveries`),
    fetch(`${API_URL}/customers`),
    fetch(`${API_URL}/boxes`)
  ])
  
  const parallelDuration = Date.now() - parallelStart
  console.log(`✅ Parallel requests (4 endpoints)`)
  console.log(`   Total Time: ${parallelDuration}ms\n`)
  
  // Summary
  console.log('=' .repeat(60))
  console.log('📊 SUMMARY\n')
  
  const successful = results.filter(r => r.success)
  const avgTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
  const totalSize = successful.reduce((sum, r) => sum + parseFloat(r.sizeKB), 0)
  
  console.log(`Total Tests: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${results.length - successful.length}`)
  console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`)
  console.log(`Total Data Downloaded: ${totalSize.toFixed(2)} KB`)
  console.log(`Parallel Load Time: ${parallelDuration}ms`)
  
  // Performance Rating
  console.log('\n🎯 Performance Rating:')
  if (avgTime < 200) {
    console.log('   ⭐⭐⭐⭐⭐ Excellent (<200ms)')
  } else if (avgTime < 500) {
    console.log('   ⭐⭐⭐⭐ Good (<500ms)')
  } else if (avgTime < 1000) {
    console.log('   ⭐⭐⭐ Average (<1s)')
  } else if (avgTime < 2000) {
    console.log('   ⭐⭐ Needs Improvement (<2s)')
  } else {
    console.log('   ⭐ Poor (>2s) - Optimization Required!')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Tests completed!\n')
}

// Run tests
runPerformanceTests().catch(console.error)
