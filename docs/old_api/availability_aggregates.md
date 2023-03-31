**Get hourly aggregates for object availabilities**
----
  Endpoint to query availability by hour between dates for a specific service point.

**URL:**

/api/v1/availability_aggregates

**Method:**

`GET`

**URL Params**

* **Required** <br />
  None
* **Optional** <br />
  `service_point_id = [Integer, Array]` => Optionally limit aggregates to a specific service point or set of service points.<br />
  `date_start = [DateTime]` => Optionally limit list to aggregate starting at this date.<br />
  `date_end = [DateTime]` => Optionally limit list to aggregate ending at this date.<br />

**Data Params**

  None

**Success Response:**

  * **Code:** 200 <br />
    **Content:**

    Return an Array of Object which count the number of available and unavailable, by month, of the  service_points requested, or every service_points. 

    One object per month. 

  ```
  0: { 
    available: Integer, 
    date: Date, 
    id: String,
    is_available: Boolean,
    time_frame: String,
    unavailable: Integer
  },
  1: { 
    available: Integer, 
    date: Date, 
    id: String,
    is_available: Boolean,
    time_frame: String,
    unavailable: Integer
  },
  ...,
  x: { 
    available: Integer, 
    date: Date, 
    id: String,
    is_available: Boolean,
    time_frame: String,
    unavailable: Integer
  },
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

  * Frontend app

**Sample Call:**

  ```javascript
    $.ajax({
      url: "/api/v1/availability_aggregates",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  ```javascript
    $.ajax({
      url: "/api/v1/availability_aggregates?service_point_id=157,180&date_end=2018-08-17T23:59:59Z&date_start=2018-08-11T00:00:00Z",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  ```javascript
    $.ajax({
      url: "/api/v1/availability_aggregates?service_point_id=157&date_end=2018-08-17T23:59:59Z&date_start=2018-08-11T00:00:00Z",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  ```javascript
    $.ajax({
      url: "/api/v1/availability_aggregates?service_point_id=157&date_end=2018-08-17T23:59:59Z&date_start=2018-01-11T00:00:00Z",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  ```javascript
    $.ajax({
      url: "/api/v1/availability_aggregates?date_end=2018-08-17T23:59:59Z&date_start=2018-01-11T00:00:00Z",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```