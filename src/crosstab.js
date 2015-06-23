var VAL_KEY = '@@@@',
    POS_KEY = '!@!@'

ngCubes.directive('cubesCrosstab', ['$rootScope', '$http', function($rootScope, $http) {
  return {
  restrict: 'EA',
  require: '^cubes',
  scope: {
    drilldown: '='
  },
  templateUrl: 'angular-cubes-templates/crosstab.html',
  link: function(scope, element, attrs, cubesCtrl) {
    //var model = null, query = {};
    scope.columns = [];
    scope.rows = [];
    scope.table = [];

    var query = function(model, state) {
      state.rows = asArray(state.rows);
      state.columns = asArray(state.columns);
      // TODO: handle a case in which both sets contain the same
      // ref.

      var q = cubesCtrl.getQuery();
      q.aggregates = q.aggregates.concat(state.aggregates);
      q.drilldown = q.drilldown.concat(state.rows);
      q.drilldown = q.drilldown.concat(state.columns);
      q.pagesize = q.pagesize * 10000;

      q.order = asArray(q.order);
      var drilldowns = state.rows.concat(state.columns);
      for (var i in drilldowns) {
        var dd = drilldowns[i];
        // TODO: sorting?
        if (q.order.indexOf(dd) == -1) {
          q.order.push(dd);
        }
      }
      var dfd = $http.get(cubesCtrl.getApiUrl('aggregate'),
                          cubesCtrl.queryParams(q));
      dfd.then(function(res) {
        queryResult(res.data, q, model, state);
      });
    };

    var queryResult = function(data, q, model, state) {
      // console.log('crosstab received data');
      if (!model) return;

      state.rows = asArray(state.rows);
      state.columns = asArray(state.columns);

      var aggregates = model.aggregates.filter(function(agg) {
        return data.aggregates.indexOf(agg.ref) != -1;
      });

      // following code inspired by: 
      // https://github.com/DataBrewery/cubes/blob/master/cubes/formatters.py#L218
      var matrix = {}, table = [],
          row_headers = [], column_headers = [],
          row_keys = [], column_keys = [];

      for (var i in data.cells) {
        var pick = function(k) { return cell[k]; };
        var cell = data.cells[i],
            row_values = state.rows.map(pick),
            row_set = row_values.join(VAL_KEY),
            all_column_values = state.columns.map(pick);

        for (var k in aggregates) {
          var agg = aggregates[k],
              label = agg.label || agg.name,
              column_values = all_column_values.concat([label]);
              column_set = column_values.join(VAL_KEY)

          if (row_keys.indexOf(row_set) == -1) {
            row_keys.push(row_set);
            row_values.key = row_set;
            row_headers.push(row_values);
          }

          if (column_keys.indexOf(column_set) == -1) {
            column_keys.push(column_set);
            column_headers.push(column_values);
          }

          var key = [row_set, column_set].join(POS_KEY);
          matrix[key] = cell[agg.name];
        }
      }

      for (var i in row_keys) {
        var row_key = row_keys[i];
        var row = [];
        for (var j in column_keys) {
          var column_key = column_keys[j];
          var key = [row_key, column_key].join(POS_KEY);
          row.push(matrix[key] || data.aggregates.map(function(a) { return undefined; }));
        }
        table.push(row);
      }
   
      scope.rows = row_headers;
      scope.columns = column_headers;
      scope.table = table;
    };


    $rootScope.$on(cubesCtrl.modelUpdate, function(event, model, state) {
      query(model, state);
    });

    // console.log('crosstab init');
    cubesCtrl.init({
      rows: {label: 'Rows', multiple: true},
      columns: {label: 'Columns', multiple: true},
    });
  }
  };
}]);
