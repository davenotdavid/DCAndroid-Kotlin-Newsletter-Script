// Despite Apps Script being based on JS, classes aren't supported 
// yet on this engine. That said, here's an anonymous "class" used 
// instead.
var Post = function(url, title, description) {
  this.url = url;
  this.title = title;
  this.description = description;

  this.logPost = function() {
    var logStr = Utilities.formatString("url: %s\ntitle: %s\ndescription: %s\n", 
                                        this.url, 
                                        this.title, 
                                        this.description
                                       );
    Logger.log(logStr);
  }
};

// The following constants ("const" modifier not included in Apps Script) 
// serve as a part of the newsletter draft template.
var jared = "jaredasheehan@gmail.com";
var joni = "joni@pepinonline.com";
var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
var disclaimer = "-This draft was initially run and created by Google Apps Script-"
var greeting = "Greetings Green Robots and Kolleagues,";
var callForTalksHeader = "Call for Talks";
var upcomingEventsHeader = "Upcoming Events";
var newsMediaHeader = "News/Media";
var callForTalksBody = "What\'s first is first - if you\'re ever interested in giving a talk on an Android-related (or Kotlin, Flutter, or heck, a Google-related) technology sometime soon, please don\'t hesitate to ask! We\'re very open about it.";
var salutation = "Best,";
var sender = "DCAndroid/Kotlin Organizers";
var dcAndroidHandle = "@DCAndroid";
var dcKotlinHandle = "@DCKotlin";
var dcAndroidUrl = "https://twitter.com/DCAndroid";
var dcKotlinUrl = "https://twitter.com/DCKotlin";

// URL regex, and a regex for the title of a post (matches sequential
// text excluding what looks like a URL), respectively.
var urlRegex = /(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/[^ \)]*)?/;
var titleRegex = /(?:^|\s+)((?:(?!:\/\/).)*)(?=\s|$)/;

// Two separate arrays since we wanna prioritize news over media 
// (i.e. articles and tutorials) within the same "News/Media" 
// header.
var newsArray = [];
var mediaArray = [];

// Initiates the series of "chained" functions used in order to create 
// a draft template consisting of HTML-encoded, formatted news/media 
// content: searchAndroidWeekly() -> searchKotlinWeekly() -> searchFlutterWeekly() -> createDraft()
// 
// Basically, this whole script assumes that you're subscribed to at 
// least one of the weekly newsletters - Android Weekly, Kotlin Weekly, 
// or Flutter Weekly - in order to get a compiled newsletter draft 
// template as a result. Either way, this script should still run 
// without breaking.
function main() {
  searchAndroidWeekly();
}

// Debugging purposes: Logs a class' properties/functions/etc. 
// since Apps Script lacks some attributes compared to JS.
function getOwnPropertyNames() {
  Logger.log(Object.getOwnPropertyNames(String.prototype));
}

// "Locally" queries and searches the runner's (of this script) inbox for 
// Android-related news/media (Android Weekly newsletter subscription) for the past 30 days (which enforces the 
// standard of monthly newsletters) to eventually push the Posts into 
// their respective arrays by using Gmail Service's 
// (https://developers.google.com/apps-script/reference/gmail) relevant 
// classes and functions to retrieve a thread/message/body, complex regexes 
// to match patterns against news/media content worth considering, and 
// eventually invoking the next function for querying the Kotlin newsletter.
//
// This function will basically store the top article & tutorial of each 
// Android Weekly newsletter while prioritizing and storing all of the 
// news onto the draft template.
function searchAndroidWeekly() {
  var query = "in:inbox subject:(Android Weekly) newer_than:30d";
  var threads = GmailApp.search(query);
  
  // TODO: Not the prettiest regexes for this newsletter, but gets the job done for now.
  var artAndTutRegExp = RegExp("\\*\\* Articles & Tutorials[\\s\\S]*?\\*\\* ");
  var newsRegExp = RegExp("\\*\\* News[\\s\\S]*?\\*\\* ");
  // TODO: Create a regex for the "Specials" section of their newsletter that recently came out
  
  for each (thread in threads) {    
    var messages = thread.getMessages();
    var body = messages[0].getPlainBody();
    
    var containsArtAndTut = artAndTutRegExp.test(body);
    if (containsArtAndTut) {
      var matches = artAndTutRegExp.exec(body);
      var elements = matches[0].split("\n");
      var filteredElements = elements.filter(function(item) {
        var startCharRegExp = RegExp("^[a-zA-Z]");
        var startsWithChar = startCharRegExp.test(item);
        
        // Just because simply String equality doesn't suffice 
        // here.
        var sponsRegExp = RegExp("Sponsored");
        var containsSponsTxt = sponsRegExp.test(item);
        
        return startsWithChar && !containsSponsTxt;
      });
      
      var post = new Post();
      for each (element in filteredElements) {
        var containsUrl = urlRegex.test(element);
        if (containsUrl) { // Assuming it contains a title as well
          post.url = urlRegex.exec(element)[0];
          
          var containsTitle = titleRegex.test(element);
          if (containsTitle) {
            post.title = titleRegex.exec(element)[0];
          }
        } else { // Assuming it's a description instead
          post.description = element;
          
          mediaArray.push(post);
          
          // Only retrieves the top article/tutorial from each thread
          break;
        }
      }
    }
    
    var containsNews = newsRegExp.test(body);
    if (containsNews) {
      var matches = newsRegExp.exec(body);
      var elements = matches[0].split("\n");
      var filteredElements = elements.filter(function(item) {
        var startCharRegExp = RegExp("^[a-zA-Z]");
        var startsWithChar = startCharRegExp.test(item);
        
        // Just because simply String equality doesn't suffice 
        // here.
        var sponsRegExp = RegExp("Sponsored");
        var containsSponsTxt = sponsRegExp.test(item);
        
        var isLegitimatePost = startsWithChar && !containsSponsTxt
        return isLegitimatePost;
      });
      
      post = new Post();
      for each (element in filteredElements) {
        var containsUrl = urlRegex.test(element);
        if (containsUrl) { // Assuming it contains a title as well
          post.url = urlRegex.exec(element)[0];
          
          var containsTitle = titleRegex.test(element);
          if (containsTitle) {
            post.title = titleRegex.exec(element)[0];
          }
        } else { // Assuming it's a description instead
          post.description = element;
          
          newsArray.push(post);
          
          // Re-inits as a hack for iterating through another post.
          post = new Post();
        }
      }
    }
  }
  
  searchKotlinWeekly();
}

// "Locally" queries and searches the runner's (of this script) inbox for 
// Kotlin-related news/media (Kotlin Weekly newsletter subscription) for 
// the past 30 days (which enforces the standard of monthly newsletters) 
// to eventually push the Posts into their respective arrays by using Gmail 
// Service's (https://developers.google.com/apps-script/reference/gmail) 
// relevant classes and functions to retrieve a thread/message/body, complex 
// regexes to match patterns against news/media content worth considering, and 
// eventually invoking the next function for querying the Flutter newsletter.
//
// This function will basically store the top article & tutorial of each 
// Kotlin Weekly newsletter.
function searchKotlinWeekly() {
  var query = "in:inbox subject:(Kotlin Weekly) newer_than:30d";
  var threads = GmailApp.search(query);
  
  var mediaRegExp = RegExp("\\*\\* Kotlin Weekly Newsletter[\\s\\S]*?\\*\\* ");
  
  for each (thread in threads) {    
    var messages = thread.getMessages();
    var body = messages[0].getPlainBody();
    
    var containsMedia = mediaRegExp.test(body);
    if (containsMedia) {
      var matches = mediaRegExp.exec(body);
      var elements = matches[0].split("\n");
      var filteredElements = elements.filter(function(item) {
        var startCharRegExp = RegExp("^[a-zA-Z]");
        var startsWithChar = startCharRegExp.test(item);
        
        // Hard-coded regex specifically for this newsletter in 
        // order to run the logic afterwards.
        var helloRegExp = RegExp("Hello Kotliners");
        var containsHello = helloRegExp.test(item);
        var helloRegExp2 = RegExp("Hello from ");
        var containsHello2 = helloRegExp2.test(item);
        
        // Just because simply String equality doesn't suffice 
        // here.
        var sponsRegExp = RegExp("Sponsored");
        var containsSponsTxt = sponsRegExp.test(item);

        var sponsPusherRegExp = RegExp("Pusher");
        var containsPusherSponsTxt = sponsPusherRegExp.test(item);
        
        var isLegitimatePost = startsWithChar && !containsHello && !containsHello2 && !containsSponsTxt && !containsPusherSponsTxt
        return isLegitimatePost;
      });
      
      var post = new Post();
      for each (element in filteredElements) {
        var containsUrl = urlRegex.test(element);
        if (containsUrl) { // Assuming it contains a title as well
          post.url = urlRegex.exec(element)[0];
          
          var containsTitle = titleRegex.test(element);
          if (containsTitle) {
            post.title = titleRegex.exec(element)[0];
          }
        } else { // Assuming it's a description instead
          post.description = element;
          
          mediaArray.push(post);
          
          // Only retrieves the top article/tutorial from each thread
          break;
        }
      }
    }
  }
  
  searchFlutterWeekly();
}

// "Locally" queries and searches the runner's (of this script) inbox for 
// Flutter-related news/media (Flutter Weekly newsletter subscription) for 
// the past 30 days (which enforces the standard of monthly newsletters) 
// to eventually push the Posts into their respective arrays by using Gmail 
// Service's (https://developers.google.com/apps-script/reference/gmail) 
// relevant classes and functions to retrieve a thread/message/body, complex 
// regexes to match patterns against news/media content worth considering, and 
// eventually invoking the last "chained" function for creating the newsletter 
// draft with the compiled results.
//
// This function will basically store the top article & tutorial of each 
// Flutter Weekly newsletter.
function searchFlutterWeekly() {
  var query = "in:inbox subject:(Flutter Weekly) newer_than:30d";
  var threads = GmailApp.search(query);
  
  // TODO: Not the prettiest regex for this newsletter, but gets the job done for now.
  var artAndTutRegExp = RegExp("\\*\\* Articles and tutorials[\\s\\S]*?\\*\\* Videos and media");
  
  for each (thread in threads) {    
    var messages = thread.getMessages();
    var body = messages[0].getPlainBody();
    
    var containsArtAndTut = artAndTutRegExp.test(body);
    if (containsArtAndTut) {
      var matches = artAndTutRegExp.exec(body);
      var elements = matches[0].split("\n");
      var filteredElements = elements.filter(function(item) {

        // Asterisk literal is an exception here since all plain message posts 
        // are bold headers.
        var startCharRegExp = RegExp("^[a-zA-Z\\*]");
        var startsWithChar = startCharRegExp.test(item);
        
        // Excludes the header that was originally part of the regex match.
        var artAndTutHeadRegExp = RegExp("\\*\\* Articles and tutorials");
        var containsArtAndTutHead = artAndTutHeadRegExp.test(item);
        
        // Just because simply String equality doesn't suffice 
        // here.
        var sponsRegExp = RegExp("Sponsored");
        var containsSponsTxt = sponsRegExp.test(item);
        
        var isLegitimatePost = startsWithChar && !containsArtAndTutHead && !containsSponsTxt
        return isLegitimatePost;
      });
      
      var post = new Post();
      for each (element in filteredElements) {
        var containsUrl = urlRegex.test(element);
        if (containsUrl) { // Assuming it contains a title as well
          post.url = urlRegex.exec(element)[0];
          
          var containsTitle = titleRegex.test(element);
          if (containsTitle) {
            post.title = titleRegex.exec(element)[0];
          }
        } else { // Assuming it's a description instead
          post.description = element;
          
          mediaArray.push(post);
          
          // Only retrieves the top article/tutorial from each thread
          break;
        }
      }
    }
  }
  
  createDraft();
}

// Invoked from the series of "chained" functions responsible for pushing 
// out the relevant Posts consisting of the relevant news/media content 
// initially retrieved from the three weekly newsletters mentioned 
// throughout the script. With these Posts, this function will basically 
// encode its properties into an HTML-encoded template body prior to 
// actually creating the Gmail draft.
function createDraft() {
  var date = new Date();
  var month = "";
  if (date.getMonth() == monthNames.length - 1) { // Iterates back to January when reaching the end
    month = monthNames[0];
  } else { // Otherwise, assigns the next upcoming month
    month = monthNames[date.getMonth() + 1];
  }
  var subject = Utilities.formatString("DCAndroid/Kotlin %s Newsletter Draft", month);

  var encodedBody = Utilities.formatString("<i>%s</i><br />&nbsp;<br />%s<br />&nbsp;<br /><b>%s</b><br />&nbsp;<br />%s<br />&nbsp;<br /><b>%s</b><br />&nbsp;<br /><i>// TODO</i><br />&nbsp;<br /><b>%s</b><br />&nbsp;<br />", 
                                    disclaimer,
                                    greeting, 
                                    callForTalksHeader, 
                                    callForTalksBody, 
                                    upcomingEventsHeader, 
                                    newsMediaHeader
                                   );
  for each (post in newsArray) {
    var htmlEncoding = Utilities.formatString(
      "\-<a href=%s>%s</a>: %s<br />&nbsp;<br />", 
      post.url, 
      post.title, 
      post.description
    );
    
    encodedBody += htmlEncoding;
  }

  for each (post in mediaArray) {
    var htmlEncoding = Utilities.formatString(
      "\-<a href=%s>%s</a>: %s<br />&nbsp;<br />", 
      post.url, 
      post.title, 
      post.description
    );
    
    encodedBody += htmlEncoding;
  }
  
  var salutationTxt = Utilities.formatString("%s<br />&nbsp;<br />%s<br><a href=%s>%s</a> / <a href=%s>%s</a>", 
                                             salutation, 
                                             sender, 
                                             dcAndroidUrl, 
                                             dcAndroidHandle, 
                                             dcKotlinUrl, 
                                             dcKotlinHandle
                                            );
  encodedBody += salutationTxt;
  
  // Here's where the magic happens.
  GmailApp.createDraft(jared, subject, "Body to be replaced", {
    cc: joni,
    htmlBody: encodedBody
  });
}
