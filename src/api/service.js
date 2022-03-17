const cacheRepoList = {};
export const getGithubRepoList = (searchText) => {
  return new Promise((resolve, reject) => {
    if (cacheRepoList[searchText]) {
      resolve(cacheRepoList[searchText]);
      return;
    }
    const queryString = "q=" + encodeURIComponent(`${searchText} org:apache`);

    fetch(`https://api.github.com/search/repositories?${queryString}`)
      .then((response) => {
        return response.json();
      })
      .then((myJson) => {
        const filterdData = myJson.items.map((item) => item.full_name);
        if (!cacheRepoList[searchText]) {
          cacheRepoList[searchText] = filterdData;
        }
        resolve(filterdData);
      })
      .catch((e) => {
        reject();
      });
  });
};
