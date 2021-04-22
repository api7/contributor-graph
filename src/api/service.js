const cacheRepoList = {};
export const getGithubRepoList = searchText => {
  return new Promise((resolve, reject) => {
    if (cacheRepoList[searchText]) {
      resolve(cacheRepoList[searchText]);
      return;
    }
    fetch(`https://api.github.com/search/repositories?q=${searchText}`)
      .then(response => {
        return response.json();
      })
      .then(myJson => {
        const filteredData = myJson.items
          .filter(item => item.full_name.startsWith(searchText))
          .map(item => item.full_name);
        if (!cacheRepoList[searchText]) {
          cacheRepoList[searchText] = filteredData;
        }
        resolve(filteredData);
      })
      .catch(e => {
        reject();
      });
  });
};
