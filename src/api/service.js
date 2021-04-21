export const getGithubRepoList = searchText => {
  return new Promise((resolve, reject) => {
    fetch(`https://api.github.com/search/repositories?q=${searchText}`)
      .then(response => {
        return response.json();
      })
      .then(myJson => {
        const filteredData = myJson.items
          .filter(item => item.full_name.startsWith("apache/" + searchText))
          .map(item => item.full_name);
        resolve(filteredData);
      })
      .catch(e => {
        reject();
      });
  });
};
