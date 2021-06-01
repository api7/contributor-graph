export const generateDefaultOption = ({ handleShareClick = () => {} }) => {
  return {
    color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
    legend: {
      top: "5%",
      data: [],
      textStyle: {
        fontSize: 14
      }
    },
    toolbox: {
      feature: {}
    },
    dataset: [],
    title: {
      text: ""
    },
    tooltip: {
      trigger: "axis"
    },
    xAxis: {
      type: "time",
      nameLocation: "middle",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14
        }
      }
    },
    yAxis: {
      name: "",
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 14
        }
      }
    },
    series: [],
    grid: {
      x: 10,
      x2: 15,
      y: 80,
      containLabel: true
    }
  };
};

export const DEFAULT_ACTIVITY_OPTIONS = {
  color: ["#39a85a", "#4385ee", "#fabc37", "#2dc1dd", "#f972cf", "#8331c8"],
  legend: {
    top: "10%",
    data: [],
    textStyle: {
      fontSize: 16
    }
  },
  toolbox: {
    feature: {}
  },
  dataset: [],
  title: {
    text: "Monthly Active Contributors",
    subtext:
      "The number of contributors who committed to main branch in each month"
  },
  tooltip: {
    trigger: "axis"
  },
  xAxis: {
    type: "time",
    nameLocation: "middle",
    axisLabel: {
      show: true,
      textStyle: {
        fontSize: 14
      }
    }
  },
  yAxis: {
    name: "",
    axisLabel: {
      show: true,
      textStyle: {
        fontSize: 14
      }
    }
  },
  series: [],
  grid: {
    x: 10,
    x2: 15,
    y: 80,
    containLabel: true
  }
};

export const DEFAULT_COLOR = "#39a85a";
