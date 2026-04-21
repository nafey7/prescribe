import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material";
import { ChevronDown, Utensils } from "lucide-react";
import type { MealPlanPayload } from "../../types/mealPlan";

interface MealPlanMessageProps {
  payload: MealPlanPayload;
  isStreaming?: boolean;
}

export function MealPlanMessage({ payload, isStreaming }: MealPlanMessageProps) {
  const firstDay = payload.days[0]?.day_index ?? false;
  const [expanded, setExpanded] = useState<number | false>(firstDay);

  const handleChange =
    (dayIndex: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? dayIndex : false);
    };

  return (
    <Box
      sx={{
        width: "100%",
        "@media (prefers-reduced-motion: reduce)": {
          "& .MuiAccordion-root, & .MuiAccordionDetails-root": {
            transition: "none !important",
          },
        },
      }}
    >
      {payload.summary ? (
        <Typography
          variant="body2"
          sx={{ mb: 1.5, color: "text.secondary", lineHeight: 1.6 }}
        >
          {payload.summary}
        </Typography>
      ) : null}

      {payload.days.map((day) => (
        <Accordion
          key={day.day_index}
          expanded={expanded === day.day_index}
          onChange={handleChange(day.day_index)}
          disableGutters
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "6px !important",
            mb: 0.75,
            overflow: "hidden",
            "&:before": { display: "none" },
            "&.Mui-expanded": {
              borderColor: alpha(theme.palette.secondary.main, 0.45),
            },
          })}
        >
          <AccordionSummary
            expandIcon={<ChevronDown size={15} />}
            sx={(theme) => ({
              minHeight: 38,
              px: 1.5,
              "&.Mui-expanded": {
                bgcolor: alpha(theme.palette.secondary.main, 0.07),
              },
              "& .MuiAccordionSummary-content": { my: 0.5 },
              "& .MuiAccordionSummary-expandIconWrapper": {
                color: "text.secondary",
              },
            })}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {day.label ?? `Day ${day.day_index}`}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 1.5, pt: 0.75, pb: 1.25 }}>
            {day.meals.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                No meals specified for this day.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {day.meals.map((meal, mIdx) => (
                  <Box key={mIdx}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        mb: 0.25,
                      }}
                    >
                      <Box
                        sx={(theme) => ({ color: theme.palette.secondary.main, lineHeight: 0 })}
                      >
                        <Utensils size={12} strokeWidth={2} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {meal.name}
                      </Typography>
                    </Box>

                    {meal.description ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: meal.items.length > 0 ? 0.5 : 0, lineHeight: 1.5 }}
                      >
                        {meal.description}
                      </Typography>
                    ) : null}

                    {meal.items.length > 0 ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                        {meal.items.map((item, iIdx) => (
                          <Chip
                            key={iIdx}
                            label={item}
                            size="small"
                            variant="outlined"
                            sx={(theme) => ({
                              fontSize: "0.7rem",
                              height: 22,
                              borderRadius: "4px",
                              borderColor: theme.palette.divider,
                              color: "text.secondary",
                            })}
                          />
                        ))}
                      </Box>
                    ) : null}

                    {mIdx < day.meals.length - 1 ? (
                      <Divider sx={{ mt: 1, mb: 0.25 }} />
                    ) : null}
                  </Box>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {payload.disclaimer ? (
        <Typography
          variant="caption"
          sx={(theme) => ({
            display: "block",
            mt: 1.25,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            color: "text.secondary",
            borderLeft: `3px solid ${alpha(theme.palette.warning.main, 0.45)}`,
            lineHeight: 1.55,
            fontStyle: "italic",
          })}
        >
          {payload.disclaimer}
        </Typography>
      ) : null}

      {isStreaming ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            display: "inline-block",
            width: 2,
            height: "1em",
            ml: 0.25,
            verticalAlign: "text-bottom",
            bgcolor: "currentColor",
            "@keyframes chatBlinkCursor": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0 },
            },
            animation: "chatBlinkCursor 0.8s steps(1) infinite",
          }}
        />
      ) : null}
    </Box>
  );
}
