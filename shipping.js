const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Read json file by filename
async function readJson(fileName) {
  const data = await fs.readFile(path.join(__dirname, fileName));
  return JSON.parse(data);
}

// Validate date that is correct format
function validateDate(dateInString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  
  // Check that format is DDDD-DD-DD (N is degit)
  if (!dateInString.match(regex)) {
    return false;
  }
  const eachMonthTotalDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Split to get month and day
  const splitedDate = dateInString.split("-");
  const month = parseInt(splitedDate[1]);
  const day = parseInt(splitedDate[2]);

  if (day < 1 || day > 31) {
    return false;
  }
  if (month < 1 || month > 12) {
    return false;
  }

  // Check that day is not more than limit of each month
  return day <= eachMonthTotalDays[month - 1];
}

// Get only YYYY-MM-DD of date
function getDate(date) {
  return date.substring(0,10);
}

// Reserve slot for string that length is lower than slot
function reserveCharacter(str, length) {
  let space = '';
  for (let i = (str + '').length; i < length; i++) {
    space += ' ';
  }
  return str + space;
}

// Show orders like table
function displayOrdersTable(orders) {
  console.log(`| Order ID | Customer ID | Order Date         | Status      | Total Value |\n|----------|-------------|---------------------|-------------|-------------|`);
  for (const order of orders) {
    const line = `| ${reserveCharacter(order.orderId, 9)}| ${reserveCharacter(order.customerId, 12)}| ${reserveCharacter(order.orderDate, 21)}| ${reserveCharacter(order.status, 12)}| $${reserveCharacter(order.totalOrderValue, 12)}|`;
    console.log(line)
  }
}

// Check that json data has this property
function hasProperty(jsonData, property) {
  return jsonData.hasOwnProperty(property);
}

// Print out that json has no this property
function printJsonNoPropertyError(property) {
  console.log('This json file has no ' + property + ' property');
}

// Print out that order json has no this property
function printOrderNoPropertyError(property) {
  console.log('Some order has no ' + property + ' property');
}

// Filter orders that match the condition
async function getOrdersByDate(date, status=null) {

  // Validate date input
  if (!validateDate(date)) {
    console.log('Input date is not YYYY-MM-DD format');
    return
  }

  // Read json file
  const jsonData = await readJson('db.json');
  if (!jsonData.hasOwnProperty('orders')) {
    printJsonNoPropertyError('orders');
    return;
  }
  if (!jsonData.hasOwnProperty('customers')) {
    printJsonNoPropertyError('customers');
    return;
  }
  const orders = jsonData.orders;
  if (orders.length <= 0) {
    console.log('This json file has no orders');
    return;
  }
  let isError = false;
  let result = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!hasProperty(order, 'orderId')) {
      printOrderNoPropertyError('orderId');
      isError = true;
      break;
    }
    if (!hasProperty(order, 'customerId')) {
      printOrderNoPropertyError('customerId');
      isError = true;
      break;
    }
    if (!hasProperty(order, 'orderDate')) {
      printOrderNoPropertyError('orderDate');
      isError = true;
      break;
    }
    if (!hasProperty(order, 'status')) {
      printOrderNoPropertyError('status');
      isError = true;
      break;
    }
    if (!hasProperty(order, 'items')) {
      printOrderNoPropertyError('items');
      isError = true;
      break;
    }
    
    // Check that status is empty or null
    if (status == null || status === '') {

      // Fetch by order date only
      if (getDate(order.orderDate) === date) {
        result.push(order);
      }
    } else {

      // Fetch by order date and status
      if (order.status === status && getDate(order.orderDate) === date) {
        result.push(order);
      }
    }
  }

  // If has some error, terminate program
  if (isError) {
    return;
  }

  // Check that is has some matched order
  if (result.length == 0) {
    console.log('There is no matched order');
    return;
  }

  // Get all customer ids in json file
  const customerIds = jsonData.customers.map(x => x.customerId);
  isError = false;
  for (const order of result) {
    let totalOrderValue = 0;

    // Check that customer id is appeared in customer data
    if (!customerIds.includes(order.customerId)) {
      console.log('Some order customerId is not valid');
      isError = true;
      break;
    }
    for (const item of order.items) {
      if (!item.hasOwnProperty('quantity')) {
        console.log('Some item has no quantity property');
        isError = true;
        break;
      }
      if (!item.hasOwnProperty('price')) {
        console.log('Some item has no price property');
        isError = true;
        break;
      }
      if (isNaN(item.quantity)) {
        console.log('Some item quantity is not a number');
        isError = true;
        break;
      }
      if (isNaN(item.price)) {
        console.log('Some item price is not a number');
        isError = true;
        break;
      }

      // Add item value to order value
      totalOrderValue += item.quantity * item.price;
    }
    if (isError) {
      break;
    }

    // Add new property to order
    order.totalOrderValue = totalOrderValue;
  }
  
  if (isError) {
    return;
  }

  return result;
}

// Let user input order date
rl.question('Please input order date: ', (orderDate) => {

  // Let user input order status
  rl.question('Please input status: ', async (status) => {

    // Get orders by conditions
    const orders = await getOrdersByDate(orderDate,status);
    if (orders == null || orders.length <= 0) {
      return;
    }

    // Show orders result
    displayOrdersTable(orders);
    rl.close();
  });
});