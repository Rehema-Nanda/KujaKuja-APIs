**Get current server time in UTC**
----
  Returns current server time in UTC.

**URL:**

/api/v1/current_server_time

**Method:**

`GET`

**URL Params**

*  **Required** <br />
  None
*  **Optional** <br />
  None

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**

  ```
  { 
    current_date : "2018-08-17T14:57:28+00:00" 
  }
  ```

**Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:**

  ```
  { 
    status: 404, 
    error : "", 
    trace: "Rails backtrace", 
    params: "request params" 
  }
```

OR

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:**

  ```
    { 
      error : "Unauthorized" 
    }
  ```

**Consumer(s):**

  * Survey app

**Sample Call:**

  ```javascript
    $.ajax({
      url: "/api/v1/current_server_time",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```
