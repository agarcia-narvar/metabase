/* eslint-disable react/prop-types */
import { getIn } from "icepick";
import _ from "underscore";
import querystring from "querystring";

import Question from "metabase-lib/lib/Question";
import {
  setOrUnsetParameterValues,
  setParameterValue,
} from "metabase/dashboard/actions";
import {
  getDataFromClicked,
  getTargetForQueryParams,
  formatSourceForTarget,
} from "metabase/lib/click-behavior";
import { renderLinkURLForClick } from "metabase/lib/formatting/link";

export default ({ question, clicked }) => {
  const settings = (clicked && clicked.settings) || {};
  const columnSettings =
    (clicked &&
      clicked.column &&
      settings.column &&
      settings.column(clicked.column)) ||
    {};

  const clickBehavior =
    columnSettings.click_behavior || settings.click_behavior;

  if (clickBehavior == null) {
    return [];
  }
  const { extraData } = clicked || {};
  const data = getDataFromClicked(clicked);
  const { type, linkType, parameterMapping, targetId } = clickBehavior;

  let behavior;

  if (!hasLinkTargetData(clickBehavior, extraData)) {
    return [];
  }

  if (type === "crossfilter") {
    const parameterIdValuePairs = getParameterIdValuePairs(parameterMapping, {
      data,
      extraData,
      clickBehavior,
    });

    behavior = {
      action: () => setOrUnsetParameterValues(parameterIdValuePairs),
    };
  } else if (type === "link") {
    if (linkType === "url") {
      behavior = {
        url: () =>
          renderLinkURLForClick(clickBehavior.linkTemplate || "", data),
      };
    } else if (linkType === "dashboard") {
      if (extraData.dashboard.id === targetId) {
        const parameterIdValuePairs = getParameterIdValuePairs(
          parameterMapping,
          { data, extraData, clickBehavior },
        );

        behavior = {
          action: () => {
            return dispatch =>
              parameterIdValuePairs.forEach(([id, value]) => {
                setParameterValue(id, value)(dispatch);
              });
          },
        };
      } else {
        const targetDashboard = extraData.dashboards[targetId];
        const queryParams = getParameterValuesBySlug(parameterMapping, {
          data,
          extraData,
          clickBehavior,
        });

        const path =
          clickBehavior.use_public_link && targetDashboard.public_uuid
            ? `/public/dashboard/${targetDashboard.public_uuid}`
            : `/dashboard/${targetId}`;
        const url = `${path}?${querystring.stringify(queryParams)}`;

        behavior = { url: () => url };
      }
    } else if (linkType === "question" && extraData && extraData.questions) {
      const queryParams = getParameterValuesBySlug(parameterMapping, {
        data,
        extraData,
        clickBehavior,
      });

      const targetQuestion = new Question(
        extraData.questions[targetId],
        question.metadata(),
      ).lockDisplay();

      const parameters = _.chain(parameterMapping)
        .values()
        .map(({ target, id, source }) => ({
          target: target.dimension,
          id,
          slug: id,
          type: getTypeForSource(source, extraData),
        }))
        .value();

      let url = null;
      if (clickBehavior.use_public_link && targetQuestion.publicUUID()) {
        url = `/public/question/${targetQuestion.publicUUID()}?${querystring.stringify(
          queryParams,
        )}`;
      } else {
        url = targetQuestion.isStructured()
          ? targetQuestion.getUrlWithParameters(parameters, queryParams)
          : `${targetQuestion.getUrl()}?${querystring.stringify(queryParams)}`;
      }

      behavior = { url: () => url };
    }
  }

  return [
    {
      name: "click_behavior",
      defaultAlways: true,
      ...behavior,
    },
  ];
};

function getParameterIdValuePairs(
  parameterMapping,
  { data, extraData, clickBehavior },
) {
  const value = _.values(parameterMapping).map(({ source, target, id }) => {
    return [
      id,
      formatSourceForTarget(source, target, {
        data,
        extraData,
        clickBehavior,
      }),
    ];
  });

  return value;
}

function getParameterValuesBySlug(
  parameterMapping,
  { data, extraData, clickBehavior },
) {
  return _.chain(parameterMapping)
    .values()
    .map(({ source, target }) => [
      getTargetForQueryParams(target, { extraData, clickBehavior }),
      formatSourceForTarget(source, target, { data, extraData, clickBehavior }),
    ])
    .filter(([key, value]) => value != null)
    .object()
    .value();
}

function getTypeForSource(source, extraData) {
  if (source.type === "parameter") {
    const parameters = getIn(extraData, ["dashboard", "parameters"]) || [];
    const { type = "text" } = parameters.find(p => p.id === source.id) || {};
    return type;
  }
  return "text";
}

function hasLinkTargetData(clickBehavior, extraData) {
  const { linkType, targetId } = clickBehavior;
  if (linkType === "question") {
    return getIn(extraData, ["questions", targetId]) != null;
  } else if (linkType === "dashboard") {
    return getIn(extraData, ["dashboards", targetId]) != null;
  }
  return true;
}
