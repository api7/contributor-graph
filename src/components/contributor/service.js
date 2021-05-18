import moment from "moment";
import { isSameDay } from "../../utils";

export const fetchData = (repo, showAlert, onDelete) => {
  if (repo === "null" || repo === null) {
    repo = "apache/apisix";
  }
  return new Promise((resolve, reject) => {
    fetch(
      `https://contributor-graph-api.apiseven.com/contributors?repo=${repo}`
    )
      .then(response => {
        if (!response.ok) {
          onDelete(repo);
          let message = "";
          switch (response.status) {
            case 403:
              message = "Hit rate limit";
              break;
            case 404:
              message = "Repo format error / Repo not found";
              break;
            default:
              message = "Request Error";
              break;
          }
          throw message;
        }
        return response.json();
      })
      .then(myJson => {
        const { Contributors = [] } = myJson;
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
        }

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
      })
      .catch(e => {
        showAlert(e, "error");
        reject();
      });
  });
};

export const fetchMergeContributor = (repo, showAlert) => {
  return new Promise((resolve, reject) => {
    fetch(
      `https://contributor-graph-api.apiseven.com/contributors-multi?repo=${repo.join(
        ","
      )}`
    )
      .then(response => {
        if (!response.ok) {
          let message = "";
          switch (response.status) {
            case 403:
              message = "Hit rate limit";
              break;
            case 404:
              message = "Repo format error / Repo not found";
              break;
            default:
              message = "Request Error";
              break;
          }
          throw message;
        }
        return response.json();
      })
      .then(myJson => {
        resolve({ repo, ...myJson });
      })
      .catch(e => {
        showAlert(e, "error");
        reject();
      });
  });
};
