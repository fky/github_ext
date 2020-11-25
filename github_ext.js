// ==UserScript==
// @name         GitHub Ext
// @version      0.1.0
// @description  GitHub 扩展脚本
//               0.1.0 Issue列表显示Project信息
// @author       Franky Gu
// @namespace    https://github.com/fky
// @include      https://github.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.js
// @resource     SEMANTIC_CSS https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  // global
  const my_css = GM_getResourceText("SEMANTIC_CSS");
  GM_addStyle(my_css);

  // $('body').append(`<div><button class="ui button">关注</button></div>`);
  const jq = $.noConflict();

  const
    objManager = new ObjManager(),
    issueListPage = new IssueListPage(objManager);

  issueListPage.startWatch();


  function IssueListPage(objManager) {
    const
      self = this,
      intevalSeconds = 1000;

    let timer = null;

    self.startWatch = () => {
      self.stopWatch();

      timer = setInterval(() => { bindList(); }, intevalSeconds);
    };

    self.stopWatch = () => {
      clearInterval(timer);
    }

    function bindList() {
      const issue_items = jq('.js-issue-row');
      if (isBlank(issue_items)) { return; }

      issue_items.each((i, target) => bindItem(jq(target)));
    }

    function bindItem(issue_item) {
      if (isBlank(issue_item)) { return; }

      const
        item_id = issue_item.attr('id'),
        issue_url = issue_item.find(`#${item_id}_link`).attr('href');

      let issue_obj = issue_item.data('issue');
      if (isExist(issue_obj)) { return; }

      issue_obj = objManager.getIssue(issue_url);
      issue_item.data('issue', issue_obj);

      issue_obj.load()
        .then(issue_data => {
          renderProejct(issue_item, issue_data);
        })
        .catch(error => console.error(error));
    }

    function renderProejct(issue_item, issue_data) {
      if (isBlank(issue_data)) { return; }

      const
        row = issue_item.children().first(),
        projects = issue_data['projects'];

      let project_col = row.find('.ext-project-col');
      if (isBlank(project_col)) {
        project_col = jq(`<div class='flex-shrink-0 pt-2 pr-2 d-flex hide-sm col-2 ext-project-col'></div>`);
        project_col.insertBefore(row.children().filter('div.flex-shrink-0').last())
      }

      project_col.empty();

      if (isBlank(projects)) { return; }

      // 只render 第一个
      const project_data = projects[0];
      const project_info = jq(`<div class='ml-2 flex-auto text-right'><div>`);
      project_info
        .append(`<div>${project_data.title}</div>`)
        .append(`<div class='text-small text-gray'>${project_data.column}</div>`)
        .appendTo(project_col);
    }
  }

  function ObjManager() {
    const self = this;

    self.issue_cache = new Cache();

    self.getIssue = (issue_url) => {
      let obj = self.issue_cache.get(issue_url);
      if (isExist(obj)) { console.log('get cache issue', issue_url); return obj; }

      return self.issue_cache.set(issue_url, new Issue(issue_url));;
    }

  }

  function Cache(storage = 'default') {
    const self = this;

    self.cache = {};

    self.get = (key) => {
      return self.cache[key]
    }

    self.set = (key, data) => {
      self.cache[key] = data;
      return data;
    }
  }

  function Issue(issue_url) {
    const self = this;
    self.data = null;

    self.load = (reload = false) => {
      return new Promise((resolve, reject) => {
        if (!reload && isExist(self.data)) { return resolve(self.data) }

        fetchHtml()
          .then(html => loadData(html))
          .then(data => resolve(data))
          .catch(error => reject(error));
      })
    }

    function loadData(html) {
      return new Promise((resolve, reject) => {
        if (!html.length) { return reject(new Error('issue html blank')) }

        self.data = praseIssue(html);
        self.data['projects'] = parseProjects(html);

        resolve(self.data)
      })
    }

    function fetchHtml() {
      return new Promise((resolve, reject) => {
        fetch(issue_url)
          .then(response => response.text())
          .then(text => resolve(jq(text)))
          .catch(error => reject(error))
      })
    }

    function praseIssue(html) {
      // TODO: id, title, etc
      return { url: issue_url };
    }

    function parseProjects(html) {
      const projects = [];

      if (!html || !html.length) { return projects; }

      const
        form = html.find('#projects-select-menu').closest('form'),
        title = form.find('a[data-hovercard-type=project] span'),
        column = form.find('.sidebar-progress-bar summary');

      if (isBlank(title)) { return projects; }

      // TODO:  目前只获取第一个project
      projects.push({
        title: title.text().trim(),
        column: column.text().trim()
      });

      return projects
    }
  }



  // Some Utils

  function isExist(obj) {
    return !isBlank(obj);
  }

  function isBlank(obj) {
    return jq.isEmptyObject(obj) || obj['length'] == 0;
  }
})();