/**
 * Charting script for the dashboard.
 * This script initializes three charts using Chart.js:
 * 1. A doughnut chart for expenses by category.
 * 2. A bar chart for expenses by month.
 * 3. A small doughnut chart for budget overview.
 */
document.addEventListener('DOMContentLoaded', () => {

  // --- Reusable Helper Functions ---

  /**
   * Safely parses comma-separated data from a DOM element's data attribute.
   * @param {string} elementId - The ID of the DOM element.
   * @param {string} datasetName - The name of the data-* attribute (e.g., 'category' for 'data-category').
   * @param {boolean} [isNumeric=false] - Whether to convert the parsed array values to numbers.
   * @returns {Array<string|number>} The parsed data as an array, or an empty array if not found.
   */
  const parseDataFromDOM = (elementId, datasetName, isNumeric = false) => {
    const element = document.getElementById(elementId);
    if (!element || !element.dataset[datasetName]) {
      console.warn(`Data source not found for element ID: "${elementId}"`);
      return [];
    }
    const data = element.dataset[datasetName].split(',');
    // Return an empty array if the only item is an empty string
    if (data.length === 1 && data[0] === '') return [];
    return isNumeric ? data.map(Number) : data;
  };

  /**
   * Generates a dynamic color palette for charts.
   * @param {number} count - The number of colors to generate.
   * @returns {{backgroundColors: string[], borderColors: string[]}} An object with color arrays.
   */
  const generateChartColors = (count) => {
    const baseColors = [
      { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' },
      { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
      { bg: 'rgba(255, 206, 86, 0.5)', border: 'rgba(255, 206, 86, 1)' },
      { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' },
      { bg: 'rgba(153, 102, 255, 0.5)', border: 'rgba(153, 102, 255, 1)' },
      { bg: 'rgba(255, 159, 64, 0.5)', border: 'rgba(255, 159, 64, 1)' },
      { bg: 'rgba(46, 204, 113, 0.5)', border: 'rgba(46, 204, 113, 1)' },
      { bg: 'rgba(231, 76, 60, 0.5)', border: 'rgba(231, 76, 60, 1)' },
    ];
    
    const backgroundColors = [];
    const borderColors = [];

    for (let i = 0; i < count; i++) {
        const color = baseColors[i % baseColors.length]; // Loop through colors if not enough
        backgroundColors.push(color.bg);
        borderColors.push(color.border);
    }

    return { backgroundColors, borderColors };
  };

  // --- Data Parsing ---
  const categoryAmounts = parseDataFromDOM('category-amount', 'category', true);
  const categoryNames = parseDataFromDOM('category-name', 'category');
  const budgetAmounts = parseDataFromDOM('budget-amount', 'budget', true);
  const monthlyLabels = parseDataFromDOM('month', 'category');
  const monthlyAmounts = parseDataFromDOM('month-amount', 'category', true);

  // --- Chart Initialization ---

  /**
   * 1. Initializes the Category Doughnut Chart
   */
  const initCategoryChart = () => {
    const ctx = document.getElementById('myChart');
    if (!ctx || categoryAmounts.length === 0) return;

    const colors = generateChartColors(categoryNames.length);
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryNames,
        datasets: [{
          data: categoryAmounts,
          backgroundColor: colors.backgroundColors,
          borderColor: colors.borderColors,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
                font: { size: 10 }
            }
          },
        },
      },
    });
  };

  /**
   * 2. Initializes the Monthly Expense Bar Chart
   */
  const initMonthlyChart = () => {
    const ctx = document.getElementById('myCategory');
    if (!ctx || monthlyAmounts.length === 0) return;

    const colors = generateChartColors(monthlyLabels.length);
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyLabels,
        datasets: [{
          label: 'Expense',
          data: monthlyAmounts,
          backgroundColor: colors.backgroundColors,
          borderColor: colors.borderColors,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          // Note: The 'yAxes' syntax is for Chart.js v2. This is the v3/v4 syntax.
          y: { 
            beginAtZero: true 
          },
          x: {
            ticks: {
              font: { size: 10 },
            },
          },
        },
      },
    });
  };

  /**
   * 3. Initializes the Budget Overview Doughnut Chart
   */
  const initBudgetChart = () => {
    const ctx = document.getElementById('myBudget');
    if (!ctx || budgetAmounts.length === 0) return;

    const colors = generateChartColors(2);
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Spent', 'Remaining'],
        datasets: [{
          data: budgetAmounts,
          backgroundColor: colors.backgroundColors,
          borderColor: colors.borderColors,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });
  };
  
  // --- Execute Chart Initializations ---
  initCategoryChart();
  initMonthlyChart();
  initBudgetChart();
});