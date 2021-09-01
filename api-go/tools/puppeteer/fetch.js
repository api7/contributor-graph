const moment = require('moment');
const axios = require('axios');

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const fetchContributorsData = (repo) => {
  if (repo === "null" || repo === null) {
    repo = "apache/apisix";
  }
  return new Promise((resolve, reject) => {
    axios.get(
      `https://contributor-overtime-api.apiseven.com/contributors?repo=${repo}`
    ).then(response => {
      return response.data;
    }).then(data => {
      const { Contributors = [] } = data;
      const sortContributors = Contributors.map(item => ({
        ...item,
        date: item.date.substring(0, 10)
      })).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      if (
        !isSameDay(
          new Date(sortContributors[sortContributors.length - 1].date),
          new Date()
        )
      ) {
        sortContributors.push({
          repo,
          idx: sortContributors[sortContributors.length - 1].idx,
          date: moment(new Date()).format("YYYY-MM-DD")
        });
      };

      const processContributors = [];
      sortContributors.forEach((item, index) => {
        processContributors.push(item);

        if (index !== sortContributors.length - 1) {
          const diffDays = moment(sortContributors[index + 1].date).diff(
            item.date,
            "days"
          );
          if (diffDays > 1) {
            for (let index = 1; index < diffDays; index++) {
              processContributors.push({
                ...item,
                date: moment(item.date)
                  .add(index, "days")
                  .format()
                  .substring(0, 10)
              });
            }
          }
        }
      });

      const filterData = processContributors.filter(
        (item, index) =>
          index === 0 ||
          index === processContributors.length - 1 ||
          new Date(item.date).getDate() % 10 === 5
      );

      resolve({ repo, ...{ Contributors: filterData } });
    }).catch(error => {
      reject(error);
    })
  })
};

const fetchMonthlyData = (repo) => {
  if (repo === "null" || repo === null) {
    repo = "apache/apisix";
  }
  return new Promise((resolve, reject) => {
    axios.get(
      `https://contributor-overtime-api.apiseven.com/monthly-contributor?repo=${repo}`
    )
      .then(response => {
        return response.data;
      })
      .then(myJson => {
        resolve({ repo, ...myJson });
      })
      .catch(e => {
        reject(e);
      });
  });
};

const fetchMergeContributor = (repo) => {
  return new Promise((resolve, reject) => {
    axios.get(
      `https://contributor-overtime-api.apiseven.com/contributors-multi?repo=${repo}`
    )
      .then(response => {
        return response.data;
      })
      .then(myJson => {
        console.log('myJson: ', myJson);
        resolve({ repo, ...myJson });
      })
      .catch(e => {
        reject(e);
      });
  });
};

module.exports = {
  fetchContributorsData,
  fetchMonthlyData,
  fetchMergeContributor,
}
