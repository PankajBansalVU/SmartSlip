// src/utils/chart-utils.ts
import Chart from 'chart.js/auto';
import { CategoryScale, LinearScale, PieController, ArcElement, BarController, BarElement, LineController, LineElement, PointElement, Tooltip, Legend, TooltipItem, ScriptableScaleContext } from 'chart.js';

// Register Chart.js components to avoid tree-shaking issues
Chart.register(
  CategoryScale,
  LinearScale,
  PieController,
  ArcElement,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TimeSeriesData {
  name: string;
  amount: number;
}

/**
 * Initialize a pie chart to display spending by category
 */
export const initCategoryChart = (
  canvasId: string, 
  data: CategoryData[], 
  formatCurrency: (amount: number) => string
) => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Destroy existing chart if it exists
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
  
  const labels = data.map(item => item.name);
  const values = data.map(item => item.value);
  const colors = data.map(item => item.color);
  
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 15,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'pie'>) {
              const label = context.label || '';
              const value = context.raw as number;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
};

/**
 * Initialize a bar chart to display spending over time
 */
export const initTimeChart = (
  canvasId: string,
  data: TimeSeriesData[],
  formatCurrency: (amount: number) => string
) => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return null;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Destroy existing chart if it exists
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
  
  const labels = data.map(item => item.name);
  const values = data.map(item => item.amount);
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Spending',
        data: values,
        backgroundColor: 'rgba(78, 115, 223, 0.8)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: string | number) {
              return formatCurrency(value as number);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'bar'>) {
              return formatCurrency(context.parsed.y ?? 0);
            }
          }
        },
        legend: {
          display: false
        }
      }
    }
  });
};