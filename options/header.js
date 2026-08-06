(function(){
    let template = `
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <a class="navbar-brand" href="/options/setting.html"><img src="/images/icon32.png" alt="" width="32" height="32"> </a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
    
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mr-auto">
          <li class="nav-item active">
            <a class="nav-link" href="/options/setting.html">划词小窗搜索</a>
          </li>
        </ul>
        <div class="form-inline my-2 my-lg-0">
          <a class="btn btn-outline-primary my-2 my-sm-0" href="setting.html">设置首页</a>
        </div>
      </div>
    </nav>
    `

    template += `
    <div class="container">
    <div class="mb-5 text-center page_mod fade">
        <h4 class="text-muted">${document.title}</h4>
    </div>
    </div>
`


    document.write(template);
})();
