
// ['optionsBaseUrl', 'searchConfigJsonBase64', 'domparserCodeBase64'].forEach(function(key){
//     let meta = document.querySelector('meta[name='+key+']');
//     if (meta) {
//         window[key] = meta.content || '';
//     }
// });

// if (window.searchConfigJsonBase64) {
//     let searchConfigJson = base64ToUtf8(window.searchConfigJsonBase64);
//     var searchConfig = JSON.parse(searchConfigJson);
// }

// if (window.domparserCodeBase64) {

//     // 用于插入有效代码的标签
//     let insertTag = document.createElement('script');
//     insertTag.id = 'customDomparserCode';
//     insertTag.async = false;
//     insertTag.text = 'var customDomparserCodeInsertTest = true;'
//     document.body.appendChild(insertTag);

//     if (customDomparserCodeInsertTest) {
//         let domparserCode = base64ToUtf8(window.domparserCodeBase64);

//         // 插入测试代码的标签，测试没错的才插入
//         let testTag = document.createElement('script');
//         testTag.async = false;
//         testTag.text = `
//         // 测试语法错误
//         var customDomparserCodeSyntaxError = false;
//         try {
//             Function(\`function test() { ${domparserCode} }\`);
//             customDomparserCodeSyntaxError = false;
//             document.getElementById('${insertTag.id}').text = domparserCode.codeString;
//         } catch (error) {
//             customDomparserCodeSyntaxError = true;
//         }
//         `;
//         document.body.appendChild(testTag);
//     }

// }

